(function() {

  function checkCondition(cond, record){
    return new Promise((resolve) => {
      let check = true;
      if(cond.length == 0){
        check = true
      }

      for(let element of cond){
        if(element.key in record){
          let operand_1 = null
          let operand_2 = null
          // console.log(element.type)
          // console.log(element.operator)

          if(element.type == "Text"){
            operand_1 = record[element.key]['value']
            operand_2 = element.value
          }else if(element.type == "Number"){
            operand_1 = record[element.key]['value']
            operand_2 = parseFloat(element.value)
          }else if(element.type == "Datetime"){
            operand_1 = luxon.DateTime.fromISO(record[element.key]['value']);
            operand_2 = luxon.DateTime.fromISO(element.value);
          }else if(element.type == "Date"){
            operand_1 = luxon.DateTime.fromISO(record[element.key]['value']).ts;
            operand_2 = luxon.DateTime.fromISO(element.value).ts;
          }else if(element.type == "Time"){
            operand_1 = luxon.DateTime.fromISO(record[element.key]['value']).ts;
            operand_2 = luxon.DateTime.fromISO(element.value).ts;
          }
          
          
          // console.log(operand_1)
          // console.log(operand_2)
          switch(element.operator){
            case "=":
              if(!(operand_1 === operand_2)){
                check = false;
              }
              break;
            case "<>":
              if(!(operand_1 != operand_2)){
                check = false;
              }
              break;
            case ">=":
              if(!(operand_1 >= operand_2)){
                check = false;
              }
              break;
            case "<=":
              if(!(operand_1 <= operand_2)){
                check = false;
              }
              break;
            case "false":
              return false
            case "true":
              return true
          }
        }
      }

      resolve(check);
    })
  }

  function getFiledGrop(fieldGroupName){
    return new Promise(async (resolve) => {
      let layouts = await kintone.api(kintone.api.url('/k/v1/app/form/layout', true), 'GET', {'app': AppID})
      let fieldGroup = null
      let fieldsCode = []
      for(let layout of layouts.layout){
        if(layout.type == "GROUP" && layout.code == fieldGroupName){
          fieldGroup = layout
          break
        }
      }
      for(let layout of fieldGroup.layout){
        for(let field of layout.fields){
          fieldsCode.push(field.code)
        }
      }
      resolve(fieldsCode)
    })
  }

  kintone.events.on('app.record.index.show', function(event) {
    let header_space = kintone.app.getHeaderMenuSpaceElement();
    $(header_space).append(`<div class="csi-header-menu-space"></div>`)
    $('.csi-header-menu-space').append(`<a href="https://with-you.support" target="_blank">Power by ISAS</a>`)
  });

  kintone.events.on('app.record.detail.show', function(event){
    let header_space = kintone.app.record.getHeaderMenuSpaceElement();
    $(header_space).append(`<div class="csi-header-menu-space"></div>`)
    $('.csi-header-menu-space').append(`<a href="https://with-you.support" target="_blank">Power by ISAS</a>`)
  })

  kintone.events.on(["app.record.create.show", "app.record.edit.show"],async function(event) {        
    let header_space = kintone.app.record.getHeaderMenuSpaceElement();
    $(header_space).append(`<div class="csi-header-menu-space"></div>`)
    $('.csi-header-menu-space').append(`<a href="https://with-you.support" target="_blank">Power by ISAS</a>`)
    
    
    for(let i=0; i<config.list.length; i++){
      let check = await checkCondition(config.list[i].condition, event.record)
      if(!check){
        continue
      }
      let groupOnChange = {}
      for(let element of config.list[i].selectField){
        
        let disabled = false
        let visible = true

        if(element.condition == "disabled"){
            disabled = true;
        }else if(element.condition == "hide"){
            visible = false;
        }

        if(element.hasOwnProperty('group')){
          event.record[element.group].value.forEach((row) => {
            row.value[element.key].disabled = disabled
            kintone.app.record.setFieldShown(element.key, visible);
          })

          if(!groupOnChange.hasOwnProperty(element.group)){
            groupOnChange[element.group] = {
              'disabled': disabled,
              'visible': visible,
              'codes': []
            }
          }
          groupOnChange[element.group]['codes'].push(element.key)
        }else if(element.hasOwnProperty('fieldGroup')){
          let fieldGroup = await getFiledGrop(element.fieldGroup)
          fieldGroup.forEach((code) => {
            event.record[code].disabled = disabled
            kintone.app.record.setFieldShown(code, visible);
          })
        }else{
          event.record[element.key].disabled = disabled
          kintone.app.record.setFieldShown(element.key, visible);
        }
      }

      for(let [key, val] of Object.entries(groupOnChange)){
        kintone.events.on(["app.record.create.change." + key , "app.record.edit.change." + key], function(e){
          if (e.changes.row) {
            e.record.Table.value.forEach((row) => {
              val.codes.forEach((code) => {
                row.value[code].disabled = val.disabled
              })
            })
          }
          return e
        })
      }

    }
    return event;
  });  


})();
