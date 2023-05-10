
/**
 * 
 * @callback function
 * @returns {void}
 * 
 * 
 * @callback value_changed_function
 * @param {string[]} path
 * @param {*} value
 * @param {*} old_value
 * @returns {void}
 * 
 * 
 * @typedef {Object} ChangedListener
 * @property {value_changed_function} value_changed
 * @property {function} uninstall
 * 
 * 
 * @callback install_changed_listener_function
 * @param {ChangedListener} changed_listener
 * @returns {void}
 * 
 * 
 * @callback uninstall_changed_listener_function
 * @param {ChangedListener} changed_listener
 * @returns {void}
 * 
 * 
 * @typedef {Object} ChangedListenerRegistry
 * @property {install_changed_listener_function} install_changed_listener
 * @property {uninstall_changed_listener_function} uninstall_changed_listener
 * @property {value_changed_function} notify_changed_listeners
 */

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
    var changed_listener_registry = {
        "install_changed_listener": function( changed_listener ) 
        {
            items.push( changed_listener );
        },
        "uninstall_changed_listener": function( changed_listener ) 
        {
            items = items.splice( items.indexOf(changed_listener), 1 );
        },
        "notify_changed_listeners": function( path, value, old_value ) 
        {
            for( const changed_listener of items )
                changed_listener.value_changed( path, value, old_value );
        }
    }
    
    return changed_listener_registry;
}

/**
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {value_changed_function} value_changed
 * @returns {ChangedListener}
 */
function create_and_install_changed_listener(changed_listener_registry, value_changed)
{    
    /**
     * @type {ChangedListener}
     */
    var changed_listener = {};
    changed_listener.value_changed = value_changed;
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
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @returns {void}
 */
function create_and_install_element_html_updater( delimiter, changed_listener_registry )
{
    /**
     * @type {value_changed_function}
     */
    var element_html_updater = function( path, value, old_value ) 
    {
        let html_value = value == null || value == undefined ? "" : String(value);  
        let str_path = path.join( delimiter );
        let elements = document.querySelectorAll(`[data-html="${str_path}"]`);        
        for( let element of elements )
            element.innerHTML = html_value;
    }    
    return create_and_install_changed_listener( changed_listener_registry, element_html_updater );
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @returns {void}
 */
function create_and_install_element_display_updater( delimiter, changed_listener_registry )
{
    /**
     * @type {value_changed_function}
     */
    var element_display_updater = function( path, value, old_value ) 
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
               
    for( let element of document.querySelectorAll(`*[data-display-if]`) )
        element.style.display = "none"; 

    return create_and_install_changed_listener( changed_listener_registry, element_display_updater );
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @returns {void}
 */
function create_and_install_element_visibility_updater( delimiter, changed_listener_registry )
{
    /**
     * @type {value_changed_function}
     */
    var element_visibility_updater = function( path, value, old_value ) 
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
               
    for( let element of document.querySelectorAll(`*[data-visible-if]`) )
        element.style.visibility = "hidden";  

    return create_and_install_changed_listener( changed_listener_registry, element_visibility_updater );
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
 * @returns {void}
 */
function create_and_install_element_creator( delimiter, changed_listener_registry )
{
    /**
     * @type {value_changed_function}
     */
    var element_creator = function( path, value, old_value ) 
    {
        if( is_plain_object(value) == false )
            return;
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

    for( let element of document.querySelectorAll(`*[data-children][data-template-id]`) )
        document.getElementById( element.dataset.templateId ).style.display = "none";  

    return create_and_install_changed_listener( changed_listener_registry, element_creator );
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @returns {void}
 */
function create_and_install_element_remover( delimiter, changed_listener_registry )
{
    /**
     * @type {value_changed_function}
     */
    var element_remover = function( path, value, old_value ) 
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
    }    

    return create_and_install_changed_listener( changed_listener_registry, element_remover );
}

/**
 * @callback get_value_function
 * @param {string[]|string} path
 * @returns {*}
 * 
 * @callback set_value_function
 * @param {string[]|string} path
 * @param {*} value
 * @returns {void}
 *
 * @typedef {Object} DataObject
 * @property {get_value_function} get_value
 * @property {set_value_function} set_value
 */

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
            parent[last_name] = value;
            changed_listener_registry.notify_changed_listeners ( [ ...path, ...[last_name] ], parent[last_name], old_value );   
        }
    }    

    return data_object;
}

/**
 * @callback get_currently_changed_element_function
 * @returns {Element}
 * 
 * @param {DataObject} data_object
 * @returns {get_currently_changed_element_function}
 */
function install_document_element_changed_listener( delimiter, data_object )
{
    var currently_changed_element = null;
    // add changed listener for form controls
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

    return function() { return currently_changed_element };
}

/**
 * @param {string} delimiter
 * @param {ChangedListenerRegistry} changed_listener_registry
 * @param {get_currently_changed_element_function} get_currently_changed_element
 * @returns {void}
 */
function create_and_install_element_value_updater( delimiter, changed_listener_registry, get_currently_changed_element )
{
    /**
     * @type {value_changed_function}
     */
    var element_value_updater = function( path, value, old_value ) 
    {
        let elements = document.querySelectorAll(`*[data-value="${path.join( delimiter )}"]`);     
        let html_value = value == null || value == undefined ? "" : String(value);           
        for( let element of elements )
        {
            if( element == get_currently_changed_element() )
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

    return create_and_install_changed_listener( changed_listener_registry, element_value_updater );
}

/**
 * @callback initialize_data_object_function
 * @param {DataObject}
 * @returns {void}
 */

/**
 * @param {initialize_data_object_function|null} initialize_data_object
 * @returns {DataObject}
 */
function default_startup(initialize_data_object=null)
{
    document.addEventListener("DOMContentLoaded", function() 
    {
        var delimiter = ".";
        var changed_listener_registry = create_changed_listener_registry();
        var data_object = create_data_object( changed_listener_registry );
        var get_currently_changed_element = install_document_element_changed_listener(delimiter, data_object);

        // create changed listener registry and default changed listeners
        create_and_install_element_html_updater( delimiter, changed_listener_registry );
        create_and_install_element_display_updater( delimiter, changed_listener_registry );
        create_and_install_element_visibility_updater( delimiter, changed_listener_registry );
        create_and_install_element_remover( delimiter, changed_listener_registry );
        create_and_install_element_creator( delimiter, changed_listener_registry );
        create_and_install_element_value_updater( delimiter, changed_listener_registry, get_currently_changed_element );

        if( initialize_data_object )
            initialize_data_object( data_object );
    });
}