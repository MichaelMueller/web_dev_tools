/**
 * @namespace App
 */

/**
 * @callback value_changed_function
 * @param {string[]} path
 * @param {*} value
 * @param {*} old_value
 * @returns {void}
 */

/**
 * @callback id_function
 * @returns {string}
 */

/**
 * @typedef {Object} ChangedListener
 * @property {value_changed_function} value_changed
 * @property {id_function} get_id
 * @property {function():void} uninstall
 */

/**
 * @typedef {Object} ChangedListenerRegistry
 * @property {function( ChangedListener ):void} install_changed_listener
 * @property {function( ChangedListener ):void} uninstall_changed_listener
 * @property {function( ChangedListener ):boolean} has
 * @property {value_changed_function} notify_changed_listeners
 */

/**
 * @typedef {Object} StartupFunctions
 * @property {function( function() ):void} register
 * @property {function():void} execute_all
 */

/**
 * @typedef {Object} App
 * @property {function():void} start
 * @property {function():DataObject} get_data_object
 * @property {function():ChangedListenerRegistry} get_changed_listener_registry
 * @property {function():StartupFunctions} get_startup_functions
 */

/**
 * @callback validator_function
 * @param {string} name
 * @param {*} value
 * @param {*} old_value
 * @returns {boolean}
 */

/**
 * @typedef {Object} DataObject
 * @property {function(string[]|string, *):str} create
 * @property {function(string[]|string):void} remove
 * @property {function(string[]|string):*} get_value
 * @property {function(string[]|string, *):void} set_value
 * @property {function(string[]|string):string[]|null} names
 * @property {function( validator_function ):void} register_validator
 */

/**
 * 
 * @returns {StartupFunctions}
 */
function create_startup_functions()
{   
    /**
     * @type {ChangedListener[]}
     */
    var items = [];
    /**
     * @type {StartupFunctions}
     */
    var startup_functions = {};
    
    startup_functions.register = function( function_ ) { items.push( function_ ); };
    startup_functions.execute_all = function() 
    {
        for( const function_ of items )
            function_();
    };
    return startup_functions;
}

/**
 * 
 * @returns {ChangedListenerRegistry}
 */
function create_changed_listener_registry()
{    
    /**
     * @type {ChangedListener[]}
     */
    var items = [];
    /**
     * @type {ChangedListenerRegistry}
     */
    var changed_listener_registry = {};
    changed_listener_registry.install_changed_listener = function( changed_listener ) 
    {
        if( changed_listener_registry.has( changed_listener ) )
            console.error(`Already installed: ${changed_listener}`);
        else
            items.push( changed_listener );
    };
    changed_listener_registry.uninstall_changed_listener = function( changed_listener ) 
    {
        items = items.splice( items.indexOf(changed_listener), 1 );
    };
    changed_listener_registry.notify_changed_listeners = function( path, value, old_value ) 
    {
        for( const changed_listener of items )
            changed_listener.value_changed( path, value, old_value );
    }
    changed_listener_registry.has = function( obj ) 
    {
        if( !( "get_id" in obj ) )
            return false;
        //console.log( obj.get_id() );

        for( const installed_changed_listener of items )
            if( installed_changed_listener.get_id() == obj.get_id() )
                return true;
        return false;        
    };
    
    return changed_listener_registry;
}

/**
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {value_changed_function} value_changed
 * @param {id_function} get_id
 * @returns {ChangedListener}
 */
function create_changed_listener(changed_listener_registry, value_changed, get_id)
{    
    /**
     * @type {ChangedListener}
     */
    var changed_listener = {};
    changed_listener.value_changed = value_changed;
    changed_listener.get_id = get_id;
    changed_listener.uninstall = function() { changed_listener_registry.uninstall_changed_listener( changed_listener ); };
    changed_listener.notify_changed_listeners = function( path, value, old_value )  
    {        
        for( const changed_listener of items )
            changed_listener.value_changed( path, value, old_value );
    }
    changed_listener_registry.install_changed_listener( changed_listener );
    return changed_listener;
}

/**
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {value_changed_function} value_changed
 * @param {id_function} get_id
 * @returns {ChangedListener}
 */
function create_dom_updater(changed_listener_registry, value_changed, delimiter)
{    
    /**
     * @type {id_function}
     */
    var get_id = function() { return `${delimiter}${value_changed.toString().replace(/\s+/g, '')}` }
    return create_changed_listener( changed_listener_registry, value_changed, get_id );
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @returns {ChangedListener}
 */
function create_element_html_updater( delimiter, changed_listener_registry )
{
    /**
     * @type {value_changed_function}
     */
    var value_changed = function( path, value, old_value ) 
    {
        let html_value = value == null || value == undefined ? "" : String(value);  
        let str_path = path.join( delimiter );
        let elements = document.querySelectorAll(`[data-html="${str_path}"]`);        
        for( let element of elements )
            element.innerHTML = html_value;
    }    
    return create_dom_updater( changed_listener_registry, value_changed, delimiter );
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {StartupFunctions} startup_functions
 * @returns {ChangedListener}
 */
function create_element_display_updater( delimiter, changed_listener_registry, startup_functions )
{
    /**
     * @type {value_changed_function}
     */
    var value_changed = function( path, value, old_value ) 
    {
        let str_path = path.join( delimiter );
        let html_value = value == null || value == undefined ? "" : String(value);  

        let elements = document.querySelectorAll(`[data-display-if="${str_path}"]`);        
        for( let element of elements )
        {
            let display;
            if( "displayMatches" in element.dataset )
                display = html_value == element.dataset.displayMatches;
            else
                display = value != null;
            
            let display_type = "display" in element.dataset ? element.dataset.display.toLowerCase() : "block";
            element.style.display = display ? display_type : "none";
        }
    }    
               
    startup_functions.register( function() 
    {
        for( let element of document.querySelectorAll(`*[data-display-if]`) )
            element.style.display = "none"; 
    } );    

    return create_dom_updater( changed_listener_registry, value_changed, delimiter );
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {StartupFunctions} startup_functions
 * @returns {ChangedListener}
 */
function create_element_visibility_updater( delimiter, changed_listener_registry, startup_functions )
{
    /**
     * @type {value_changed_function}
     */
    var value_changed = function( path, value, old_value ) 
    {
        let str_path = path.join( delimiter );
        let html_value = value == null || value == undefined ? "" : String(value);  

        let elements = document.querySelectorAll(`[data-visible-if="${str_path}"]`);        
        for( let element of elements )
        {
            let visible;
            if( "visibleMatches" in element.dataset )
                visible = html_value == element.dataset.visibleMatches;
            else
                visible = value != null;
            
            element.style.visibility = visible ? "visible" : "hidden";
        }
    }    
               
    startup_functions.register( function() 
    {
        for( let element of document.querySelectorAll(`*[data-visible-if]`) )
            element.style.visibility = "hidden";  
    } );

    return create_dom_updater( changed_listener_registry, value_changed, delimiter );
}

/**
 * @param {any} object
 * @returns {boolean}
 */
function is_plain_object( object ) 
{ 
    let v = object;
    return (!!v && typeof v === 'object' && (v.__proto__ === null || v.__proto__ === Object.prototype));
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {StartupFunctions} startup_functions
 * @returns {ChangedListener}
 */
function create_element_children_manager( delimiter, changed_listener_registry, startup_functions )
{
    /**
     * @type {value_changed_function}
     */
    var value_changed = function( path, value, old_value ) 
    {        
        if( value == null )
        {
            let str_path = path.join( delimiter );        
            
            let elements = document.querySelectorAll(`[data-exist="${str_path}"]`);        
            for( let element of elements )
            {
                element.remove();
            }
        }
        else if( is_plain_object(value) && Object.keys( value ) == 0 )
        {
            let parent_path = path.slice(0, -1);
            let parent_str_path = parent_path.join( delimiter ); 
            let str_child_path = path.join( delimiter );  
            
            let elements = document.querySelectorAll(`[data-children="${parent_str_path}"][data-template-id]`);        
            for( let element of elements )
            {
                let template_container = document.getElementById( element.dataset.templateId );
                let template_html = template_container.innerHTML;                    
                template_html = template_html.replaceAll( parent_str_path, str_child_path );
    
                var template = document.createElement('template');
                template.innerHTML = template_html.trim();
                let new_element = template.content.firstElementChild;
                new_element.dataset.exist = str_child_path;
                new_element.style.display = "displayType" in new_element.dataset ? new_element.dataset.displayType : "block";
                element.append( new_element );
            }
        }
    };

    startup_functions.register( function() 
    {
        for( let element of document.querySelectorAll(`*[data-children][data-template-id]`) )
            document.getElementById( element.dataset.templateId ).style.display = "none";  
    } );

    return create_dom_updater( changed_listener_registry, value_changed, delimiter );
}

/**
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @returns {DataObject}
 */
function create_data_object( changed_listener_registry )
{    
    /**
     * @type {DataObject}
     */
    var data_object = {};
    /** @type {validator_function[]} */
    var validators = [];
    var data = {};
    data_object.get_value = function( path ) 
    {
        if( Array.isArray(path) == false )
            path = [path];
        let curr_obj = data;
        for( let name of path )
        {
            if( is_plain_object(curr_obj) && name in curr_obj )
                curr_obj = curr_obj[name];
            else
                return null;            
        }        
        return curr_obj;
    }    

    data_object.set_value = function( path, value ) 
    {
        if( Array.isArray(path) == false )
            path = [path];

        let last_name = path.pop();

        let parent = data;
        let curr_path = [];
        for( let name of path )
        {
            curr_path.push(name);
            if( is_plain_object(parent) && name in parent )
                parent = parent[name];
            else
            {
                parent = {};
                data_object.set_value(curr_path, parent);
            }
        }        
        let old_value = last_name in parent ? parent[last_name] : null;

        if( is_plain_object(value) && Object.keys(value).length > 0 )
        {
            for( const [child_name, child_value] of Object.entries(value) )             
                data_object.set_value( [...path, ...[last_name, child_name]], child_value );
        }    
        else 
        {            
            for( const validator of validators )             
                if( validator( [ ...path, ...[last_name] ], value ) == false )
                    return;

            if( value == null && old_value != null )
                delete parent[last_name];
            else
                parent[last_name] = value;

            changed_listener_registry.notify_changed_listeners ( [ ...path, ...[last_name] ], parent[last_name], old_value );   
        }
    }  
    
    data_object.create = function( path, value )
    {
        if( Array.isArray(path) == false )
            path = [path];
        let uuid = crypto.randomUUID();
        path.push( uuid );
        data_object.set_value( path, value );
        return uuid;
    };
    
    data_object.remove = function( path )
    {
        data_object.set_value( path, null );
    };
    
    data_object.register_validator = function( validator )
    {
        validators.push(validator);
    };

    data_object.names = function( path )
    {
        let obj = data_object.get_value( path );
        return is_plain_object(obj) ? Object.keys( obj ) : null;
    }

    return data_object;
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {StartupFunctions} startup_functions
 * @param {DataObject} data_object
 * @returns {ChangedListener}
 */
function create_element_value_updater( delimiter, changed_listener_registry, startup_functions, data_object )
{
    var currently_changed_element = null;

    // add changed listener for form controls
    var startup_function = function() 
    {
        document.addEventListener( "change", function(event) 
        { 
            if( "value" in event.target.dataset )
            {
                try 
                {
                    let path = event.target.dataset.value.split( delimiter );
                    currently_changed_element = event.target;              
                    data_object.set_value( path, event.target.value );
                } 
                catch (error)
                {
                    currently_changed_element = null;
                    throw error;
                }
            }
        } );
    }

    /**
     * @type {value_changed_function}
     */
    var value_changed = function( path, value, old_value ) 
    {
        let elements = document.querySelectorAll(`*[data-value="${path.join( delimiter )}"]`);     
        let html_value = value == null || value == undefined ? "" : String(value);           
        for( let element of elements )
        {
            if( element == currently_changed_element )
                continue;

            let type = element.getAttribute("type") ? element.getAttribute("type").toLowerCase() : null;

            if( type == "radio" || type == "checkbox" )
            {
                if( element.value == value )
                    element.checked = true;
            }         
            
            else
            {
                element.value = html_value;
            }
        }
    }    
    
    startup_functions.register( startup_function );
    return create_dom_updater( changed_listener_registry, value_changed, delimiter );
}

/**
 * @param {string} delimiter
 * @param {StartupFunctions} startup_functions
 * @param {DataObject} data_object
 * @returns {void}
 */
function install_form_listener( delimiter, startup_functions, data_object )
{
    // add changed listener for form controls
    var startup_function = function() 
    {
        document.addEventListener( "submit", function(event) 
        { 
            if( "createIn" in event.target.dataset )
            {
                event.preventDefault();
                const data = new FormData(event.target);
                const form_data_object = {};
                data.forEach((value, key) => (form_data_object[key] = value));
                //console.log(JSON.stringify(data_object));
                path = event.target.dataset.createIn.split(".");

                data_object.create( path, form_data_object );
            }
        } );
    }
    startup_functions.register( startup_function );
}

/**
 * @returns {App}
 */
function create_default_app(delimiter=".")
{
    /** @type {App} */
    let app = {};

    var startup_functions = create_startup_functions();
    app.get_startup_functions = function() { return startup_functions; };

    var changed_listener_registry = create_changed_listener_registry();
    app.get_changed_listener_registry = function() { return changed_listener_registry; };

    var data_object = create_data_object( changed_listener_registry );
    app.get_data_object = function() { return data_object; };

    // create changed listener registry and default changed listeners
    create_element_html_updater         ( delimiter, changed_listener_registry );
    create_element_display_updater      ( delimiter, changed_listener_registry, startup_functions );
    create_element_visibility_updater   ( delimiter, changed_listener_registry, startup_functions );
    create_element_children_manager     ( delimiter, changed_listener_registry, startup_functions );
    create_element_value_updater        ( delimiter, changed_listener_registry, startup_functions, data_object );
    install_form_listener               ( delimiter, startup_functions, data_object );

    app.start = function()
    {
        document.addEventListener("DOMContentLoaded", function() 
        {    
            startup_functions.execute_all();
        });
    }

    return app;
}