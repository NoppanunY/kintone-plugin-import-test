(function($, PLUGIN_ID) {
  
  console.log($(this))
  
  const AppID = kintone.app.getId();

  var config = {}

  const cdn_required = [
    {
      'platform': 'desktop',
      'lang': 'js',
      'type': 'URL',
      'url': 'https://js.kintone.com/luxon/3.0.3/luxon.min.js'
    },
    {
      'platform': 'desktop',
      'lang': 'js',
      'type': 'URL',
      'url': 'https://js.kintone.com/jquery/3.6.1/jquery.min.js'
    }
  ]

  function alertMessage(message) {
    let href = '/k/admin/app/flow?app=' + kintone.app.getId();
    $('.container-gaia').prepend(`
    <div class="app-plugin-admin-message-gaia">
      <div>
        <a href="${href}">
          ${message}
        </a>
      </div>
    </div>`);
  }


  /**
   * 
   * @param {} appId 
   * @param {*} requiredList 
   * @returns 
   */
  async function settingPlugin(appId, requiredList){    
    var body = {}
    var scope = ""
    let updated = false

    try {
      const resp = await kintone.api(kintone.api.url('/k/v1/app/customize', true), 'GET', { 'app': AppID})
      body = resp
    } catch (error) {
      // console.log(error)
      return
    }

    kintone.api(kintone.api.url('/k/v1/app/customize', true), 'GET', {
      'app': AppID
    },async function(resp) {
      
      body = resp
      
      for(let cdn of cdn_required){
        let isExist = false
        for(let item of body[cdn.platform][cdn.lang]){
          if(item.type == "URL" && cdn.type == item.type){
            if(cdn.url == item.url) isExist = true
          }
        }
        if(!isExist){
          let text = `จำเป็นต้องติดตั้ง cdn ${cdn.url}\nยืนยันเพื่อเพิ่มอัติโนมัติ`;
          if (confirm(text) == true) {
            text = "You pressed OK!";
            updated = true
            body[cdn.platform][cdn.lang].push({
              'type': cdn.type,
              'url': cdn.url
            })
          } else {
            alert("เกิดข้อผิดพลาด")
            return;
          }
        }
      }

      if(!updated){
        luxon.Settings.defaultLocale = 'en-US'; // Sinitialize the locale
        return
      }
      
      scope = body['scope'];
      delete body['scope'];
      delete body['revision'];

      for(var platform of Object.entries(body)){
        for(var lang of Object.entries(platform[1])){
          for(var index in lang[1]){
            let type = body[platform[0]][lang[0]][index].type;

            if(type != "FILE") continue

            let fileKey = body[platform[0]][lang[0]][index].file.fileKey
            let fileName = body[platform[0]][lang[0]][index].file.name
            let newFilekey = await fetchFile(fileKey, fileName)

            body[platform[0]][lang[0]][index].file.fileKey = newFilekey

            delete body[platform[0]][lang[0]][index].file.contentType
            delete body[platform[0]][lang[0]][index].file.name
            delete body[platform[0]][lang[0]][index].file.size
          }
        }
      }

      body['app'] = AppID;
      body['scope'] = scope;
      
      kintone.api(kintone.api.url('/k/v1/preview/app/customize', true), 'PUT', resp, function(resp) {
        alertMessage('The Javascript and CSS customization have been added. Please update the app!');
      });
     
    });
  }


  /**
   * key renew
   * @param {string} fileKey old fileKey
   * @param {string} fileName file name
   * @returns new fileKey
   */
  function fetchFile(fileKey, fileName){
    return new Promise((resolve) => {
        var url = kintone.api.url('/k/v1/file.json', true) + "?fileKey=" + fileKey;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.responseType = 'blob';
        xhr.onload = function() {
          if (xhr.status === 200) {
            var blob = new Blob([xhr.response]);
            var formData = new FormData();
            formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
            formData.append('file', blob, fileName);

            var url = kintone.api.url('/k/v1/file.json', true);
            var new_xhr = new XMLHttpRequest();
            new_xhr.open('POST', url);
            new_xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            new_xhr.onload = function() {
              if (new_xhr.status === 200) {
                resolve(JSON.parse(new_xhr.responseText).fileKey)
              } else {
                // console.log(JSON.parse(new_xhr.responseText));
              }
            };
            new_xhr.send(formData);

          } else {
            // console.log(xhr.responseText);
          }
        };
        xhr.send();   
    })
  }
  
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

  
  $(document).ready(function(){
    settingPlugin()
    for(const [key, val] of Object.entries(kintone.plugin.app.getConfig(PLUGIN_ID))){
      try {
        config[key] = JSON.parse(val)
      } catch (e) {
        config[key] = val
      }
    }
    console.log(config)
  })
  
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

})(jQuery, "ddbljaghnlhgkeijnpnoiokeojffeojn");
// })(jQuery, kintone.$PLUGIN_ID);
