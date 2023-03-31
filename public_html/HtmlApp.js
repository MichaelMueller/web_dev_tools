
/**
 * 
 * @param {function} initializer_function
 * @param {string} delimiter
 * @param {string} db_file_url
 * @param {boolean} debug
 * @returns {void}
 */
function create_html_app( initializer_function, db_js_url="Db.js" )
{
    
    if( !( initializer_function instanceof Function ) )
    {
        console.error(`"initializer_function": Expected function, not ${typeof initializer_function}`);
        return;
    }
    let dependencies = [db_js_url];    

    for( const dependency of dependencies )
    {
        if( document.getElementById(dependency) )
            continue;
        let db_script_load_element = document.createElement("script");
        db_script_load_element.id = dependency;
        db_script_load_element.setAttribute("src", dependency);
        document.head.appendChild(db_script_load_element);
    }

    window.addEventListener("load", function()
    {

        /**
         * Mirroring changes to the DOM and vice versa
         * Supported tags: * 
         * - data-action: ('mkdir'|'rm') in combination with data-path
         * - data-action: ('save_in_browser'|'load_from_browser'|'remove_from_browser') in combination with data-local-storage-key
         * - data-html
         * - data-value on input, textarea, select
         * - data-display, possibly added by data-match and data-display-type
         * - data-visibility, possibly added by data-match
         * - data-path, possibly added by data-sub-dir-template-id
        */
        class HtmlApp extends Db
        {
            /**
             * 
             * @param {string} delimiter
             * @param {boolean} debug
             */
            constructor()                
            {
                //super( function() { return crypto.randomUUID(); } );
                var id = 0;
                super( function() { ++id; return String(id); } );
                /**
                 * @type {string}
                 * @protected
                 */
                this.delimiter = ".";
                /**
                 * @type {Element}
                 * @protected
                 */
                this.changed_element;
                /**
                 * @type {Object.<string, function>}
                 * @protected
                 */
                this.actions = {};

                this.actions.mkdir = function( elem ) 
                { 
                    this.dbg("mkdir called"); 

                    this.cd();
                    if( this.mkdirs_py_path( elem.dataset.path, this.delimiter ) )
                    {
                        this.mkdir();
                    }
                }.bind(this);

                this.actions.rm = function( elem ) 
                { 
                    this.dbg("rm called"); 
                    
                    let last_name = this.cd_by_path( elem.dataset.path, true, this.delimiter );
                    if( last_name )
                        this.rm( last_name );
                }.bind(this);

                this.actions.save_in_browser = function( elem ) 
                { 
                    this.dbg("save_in_browser called"); 
                    let save_id = elem.dataset.localStorageKey;
                    localStorage.setItem(save_id, this.to_json());   
                    if( "alert" in elem.dataset )   
                        alert(elem.dataset.alert);    
                }.bind(this);

                this.actions.load_from_browser = function( elem ) 
                { 
                    this.dbg("load_from_browser called"); 
                    let save_id = elem.dataset.localStorageKey;    
                    this.from_json( localStorage.getItem(save_id) ); 
                }.bind(this);

                this.actions.remove_from_browser = function( elem ) 
                { 
                    this.dbg("remove_from_browser called"); 
                    let save_id = elem.dataset.localStorageKey;   
                    let show_confirm = "confirm" in elem.dataset ? elem.dataset.confirm : "Really delete?";
                    if( show_confirm )
                        if( confirm(show_confirm) == false )
                            return;
                            
                    localStorage.removeItem(save_id);
                }.bind(this);

                this.actions.trigger_click = function( elem ) 
                { 
                    this.dbg("trigger_click called"); 
                    document.getElementById( elem.dataset.elementId ).click();    
                }.bind(this);

                this.install_listeners();
            }            
            /**
             * 
             * @param {string} value
             * @returns {boolean} 
             * @public
            */
            set_delimiter( value )
            {
                if( typeof value == "string" && value.length > 0 )
                {
                    this.delimiter = value;
                    return true;
                }
                else
                {
                    console.error(`"delimiter" must be a non-empty string, not ${value}`);
                    return false;
                }
            }
            /**
             * @param {string} action_name
             * @param {function} action
             * @returns {boolean}
             * @protected
             */
            add_action( action_name, action )
            {
                if( action_name in this.actions )
                {
                    console.error(`${action_name} already exists`);
                    return false;
                }
                this.actions[action_name] = action;
                return true;
            }
            /**
             * @returns {void}
             * @protected
             */
            install_listeners()
            {
                this.add_listener( this );

                // add changed listener for form controls
                document.addEventListener( "change", function(event) 
                { 
                    // default action is set, other things like load image, select invert go here
                    this.dbg("change event received, value: "+event.target.value);
                    if( "loadFile" in event.target.dataset && event.target.hasAttribute("type") && event.target.getAttribute("type").toLowerCase() == "file" )
                    {
                        var reader = new FileReader();
                        reader.onload = function (e) 
                        {
                            this.set( event.target.dataset.loadFile, e.target.result );
                        }.bind(this);
                        reader.onerror = () => 
                        {
                            console.error(`Error occurred reading file: ${event.target.files[0]}`);
                        };
                        reader.readAsDataURL(event.target.files[0]);

                        var style = window.getComputedStyle(event.target);
                        if( style.display == "none" )
                            event.target.value = "";
                    }
                    else if( "value" in event.target.dataset )
                    {
                        let last_name = this.cd_by_path( event.target.dataset.value, true, this.delimiter );
                        if( last_name )
                        {                        
                            this.changed_element = event.target;
                            this.set( last_name, event.target.value );
                            this.changed_element = undefined;
                        }
                    }
                }.bind(this) );
        
                // attach actions
                document.addEventListener( "click", function(event) 
                { 
                    if( "action" in event.target.dataset )
                    {
                        let action_ids = Object.keys( this.actions );
                        this.dbg("Known actions: "+ action_ids );
                        if( action_ids.includes( event.target.dataset.action ) )
                        {
                            let func = this.actions[ event.target.dataset.action ];
                            event.preventDefault();
                            func( event.target );
                        }   
                        else
                            console.error(`Unknown action ${event.target.dataset.action}`);
                    }
                }.bind(this) );
            }
            /**
             * 
             * @param {HtmlApp} html_app
             * @param {string} name
             * @param {any} prev_value
             * @param {any} value
             * @returns {void}
             * @public
             */
            value_changed( html_app, name, prev_value, value ) 
            { 
                let path = this.str_path( this.delimiter, name );
                this.dbg(`reflecting value of ${path} to the DOM`)
                // mirror it to the DOM (try/catch blocks?)
                let elements = document.querySelectorAll('*[data-value="'+path+'"]');
                this.dbg(`found ${elements.length} elements for data-value="${path}"`)
                let html_value = value == null || value == undefined ? "" : String(value);
                for(let i=0; i < elements.length; ++i)
                {
                    if( elements[i] == this.changed_element )
                        continue;

                    let tagName = elements[i].tagName.toLowerCase();
                    if(!["input", "textarea", "select", "option"].includes(tagName))
                    {
                        console.error(`data-value attribute can only be applied to input, textarea, select, option elements`);
                        continue;
                    }

                    let type = elements[i].getAttribute("type") ? elements[i].getAttribute("type").toLowerCase() : null;
                    if( type == "radio" || type == "checkbox" )
                    {
                        if( elements[i].value == value )
                            elements[i].checked = true;
                    }         
                    else
                    {
                        console.log(html_value);
                        elements[i].value = html_value;
                    }

                }

                elements = document.querySelectorAll('*[data-html="'+path+'"]');
                for(let i=0; i < elements.length; ++i)
                    elements[i].innerHTML = html_value;

                elements = document.querySelectorAll('*[data-src="'+path+'"]');
                for(let i=0; i < elements.length; ++i)
                {
                    if( elements[i].tagName.toLowerCase() != "img" )
                    {
                        console.error(`data-src attributes can only be applied to img elements, not to an ${elements[i].tagName} element`);
                        continue;
                    }
                    elements[i].src = html_value;
                }

                elements = document.querySelectorAll('*[data-display="'+path+'"]');
                for(let i=0; i < elements.length; ++i)
                {
                    let matches = "match" in elements[i].dataset ? value == elements[i].dataset.match : Boolean( value );
                    
                    if( matches == false )
                        elements[i].style.display = "none";
                    else
                    {
                        let display_type = "displayType" in elements[i].dataset ? elements[i].dataset.displayType : "block";
                        elements[i].style.display = display_type;
                    }
                }

                elements = document.querySelectorAll('*[data-visibility="'+path+'"]');
                for(let i=0; i < elements.length; ++i)
                {
                    let matches = "match" in elements[i].dataset ? value == elements[i].dataset.match : Boolean( value );
                    
                    if( matches == false )
                        elements[i].style.visibility = "hidden";
                    else
                        elements[i].style.visibility = "visible";
                }
            }         
            
            /**
             * 
             * @param {HtmlApp} html_app
             * @param {string} name
             * @param {any|undefined} prev_value
             * @returns {void}
             * @public
             */
            dir_created( html_app, name, prev_value ) 
            {
                let path = this.str_path( this.delimiter );
                let sub_dir_path = this.str_path( this.delimiter, name );
                this.dbg(`dir_created: ${sub_dir_path}`);
                let elements = document.querySelectorAll('*[data-path="'+path+'"][data-sub-dir-template-id]');
                this.dbg(`${elements.length} elements found for sub dir creation in ${path}`);
                for(let i=0; i < elements.length; ++i)
                {            
                    let elem = elements[i];    
                    let template_element = document.getElementById( elem.dataset.subDirTemplateId );
                    if( !template_element )
                    {
                        console.error( `Subdir template ${elem.dataset.subDirTemplateId} not found` );
                        continue;
                    }
                    
                    let html = template_element.outerHTML;                    
                    html = html.replaceAll( this.delimiter+elem.dataset.subDirTemplateId, sub_dir_path );
                    var template = document.createElement('template');
                    template.innerHTML = html.trim();
                    template.content.firstChild.id = "";
                    template.content.firstChild.style.display = "displayType" in template.content.firstChild.dataset ? template.content.firstChild.dataset.displayType : "block";
                    elem.append( template.content.firstChild );
                }        
            }
            /**
             * 
             * @param {HtmlApp} html_app
             * @param {string} name
             * @param {any} prev_value
             * @returns {void}
             * @public
             */
            removed( html_app, name, prev_value ) 
            {
                let path = this.str_path( this.delimiter, name );
                this.dbg(`removed: ${path}`);                
                let elements = document.querySelectorAll('*[data-path="'+path+'"]');
                for(let i=0; i < elements.length; ++i)
                {
                    elements[i].remove();
                }
            }
        }

        //console.log("create");
        let html_app = new HtmlApp();

        initializer_function( html_app );
    } );
}

