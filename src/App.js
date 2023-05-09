/**
 * @module App
 */

/**
 * Super Class for all objects that have the app instance as parent
 */
class AppObject
{
    /**
     * @param {App} app 
     */
    constructor( app )
    {
        /** 
         * @type {App}
         * @protected
        */
        this.app = app;
    }

    /**
     * @returns {App}
     */
    get_app()
    {
        return this.app;
    }
}


/**
 * @class
 * Objects of this type may react to data changes
 */
class ChangedListener extends AppObject
{
    /**
     * @param {App} app 
     */
    constructor( app )
    {
        super( app );

        app.add_changed_listener( this );
    }

    /**
     * 
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) {}
}


/**
 * Objects of this type can validate data
 */
class Validator extends AppObject
{
    /**
     * @param {App} app 
     */
    constructor( app )
    {
        super( app );

        app.add_validator( this );
    }

    /**
     * 
     * @param  {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {[boolean, *]}
     */
    filter( path, value, old_value ) 
    {
        return [ true, value ];
    }
}


/**
 * Abstract class for a Function that operates on the App
 */
class Action extends AppObject
{
    /**
     * @param {App} app 
     */
    constructor( app, name )
    {
        super( app );
        /** 
         * @type {string}
         * @protected
        */
        this.name = name;

        app.add_action( this );
    }

    /**
     * @returns {string}
     */
    get_name() { return this.name; }

    /**
     * @returns {void}
     */
    exec() {}
}


/**
 * Class for basic data management (set/get)
 */
class App
{
    /**
     * 
     */
    constructor()
    {
        /** 
         * @type {AppData}
         * @protected
         */
        this.data = {};   
        /** 
         * @type {Action[]}
         * @protected
         */
        this.actions = [];
        /** 
         * @type {Validator[]}
         * @protected
         */
        this.validators = [];
        /** 
         * @type {Array[]}
         * @protected
         */
        this.changed_listeners = [];
    }

    /**
     * @param {Action} action 
     * @returns {boolean}
     */
    add_action( action ) 
    { 
        let ok = false;
        if( ! action instanceof Action )
            console.error(`"action": Expected instance of Action, got ${action}`);
        else if( this.actions.indexOf( action ) != -1 || this.actions.findIndex( (elem) => elem.get_name() == action.get_name() ) != -1 )
            console.error(`"action": ${action} with name ${action.get_name()} already added`);
        else
        {        
            this.actions.push( action );
            ok = true;
        }
        return ok;
    }
    
    /**
     * @param {string} name 
     * @returns {Action|null}
     */
    get_action( name ) 
    { 
        for( let action of this.actions )
            if( action.get_name() == name )
                return action;
        return null;
    }

    /**
     * The only mutator function
     * @param {Validator} validator 
     * @returns {boolean}
     */
    add_validator( validator ) 
    { 
        let ok = false;
        if( ! validator instanceof Validator )
            console.error(`"validator": Expected instance of Validator, got ${validator}`);
        else if( this.validators.indexOf( validator ) != -1)
            console.error(`"validator": ${validator} already added`);
        else
        {        
            this.validators.push( validator );
            ok = true;
        }
        return ok;
    }

    /**
     * The only mutator function
     * @param {ChangedListener} changedlistener 
     * @returns {boolean}
     */
    add_changed_listener( changed_listener ) 
    { 
        let ok = false;
        if( ! changed_listener instanceof ChangedListener )
            console.error(`"changed_listener": Expected instance of ChangedListener, got ${changed_listener}`);
        else if( this.changed_listeners.indexOf( changed_listener ) != -1)
            console.error(`"changed_listener": ${changed_listener} already added`);
        else
        {        
            this.changed_listeners.push( changed_listener );
            ok = true;
        }
        return ok;
    }

    /**
     * @param {Array<string>} path 
     * @param {any} value 
     * @returns {boolean}
     */
    set( path, value ) 
    {
        let set_ok = false;
        if( Array.isArray( path ) == false )
            path = path ? [String(path)] : [];

        let last_name = path.length > 0 ? path.pop() : null;
        let parent = this.internal_get( path, true );
        let old_value = null;
        if( last_name == null )
            old_value = this.data;
        else if( last_name in parent )
            old_value = parent[last_name];

        // validate
        let [valid, filtered_value] = this.filter( path, value, old_value );

        if( valid )
        {
            value = filtered_value;

            // value == null means deletion
            if( value == null )
            {
                if( old_value != null)
                {
                    delete parent[last_name];
                    set_ok = true;
                }
            }


            // merge case
            else if( this.is_plain_object(value) && this.is_plain_object( old_value ) )
            {                
                set_ok = true;
                for ( const [child_name, child_value] of Object.entries(value) ) 
                {
                    set_ok = set_ok && this.set( [ ...path, ...[child_name] ], child_value );
                }
            }


            // otherwise set the value accordingly
            else if( last_name != null )
            {
                parent[last_name] = value;
                set_ok = true;
            }



            // Inform listeners if set was done
            if( set_ok )
            {
                path.push( last_name );
                this.changed( path, value, old_value );
            }

            return true;
        }
        return set_ok;
    }


    /**
     * 
     * @param {Array<string>} names 
     * @returns {any} 
     */
    get( ...names ) { return this.internal_get( names, false ); }


    /**
     * 
     * @param {Array<string>} path 
     * @param {any} value 
     * @returns {null|str}
     */
    add( path, value )
    {
        let parent = this.internal_get( path, true );

        // generate a new name if needed
        let new_name = Object.keys( parent ).length;
        while( String(new_name) in parent )
            new_name++;
        new_name = String(new_name);        

        path.push(new_name);
        return this.set( path, value ) ? new_name : null;
    }


    /**
     * 
     * @param {Array<string>} names 
     * @returns {boolean}
     */
    remove( ...names ) { return this.set( names, null ); }


    /**
     * @protected
     * @param {Array<string>} path
     * @param {bool} create
     * @returns {any} 
     */
    internal_get( path, create )
    {
        let curr_obj = this.data;
        let curr_path = [];
        for( let name of path )
        {
            curr_path.push( name );
            if( this.is_plain_object( curr_obj ) && name in curr_obj )
                curr_obj = curr_obj[name];
            else
            {
                if( create == true )
                {

                    // use set to create a new internal object

                    curr_obj = {};
                    this.set( curr_path, curr_obj );
                }
                else
                    return null;
            }
        }
        return curr_obj;
    }


    /**     
     * @protected
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) 
    {
        for( let changed_listener of Object.values( this.changed_listeners ) )
            changed_listener.changed( path, value, old_value );        
    }


    /**
     * 
     * @param  {string[]} path
     * @param  {string} json_string
     * @returns {boolean}
     */
    from_json(path, json_string)
    {
        return this.set(path, JSON.parse( json_string ) );
    }


    /**
     * 
     * @param  {string[]} names
     * @returns {str}
     */
    to_json(...names)
    {
        return JSON.stringify( this.get(...names) );
    }

    /**
     * 
     * @param  {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {[boolean, *]}
     */
    filter( path, value, old_value ) 
    {
        // Use other validators if any
        for( let validator of Object.values( this.validators ) )
        {
            let [valid, filtered_value] = validator.filter( path, value, old_value );
            if( valid == false )
                return [ false, value ];
            else
                value = filtered_value;
        }

        return [ true, value ];
    }

    
    /**
     * @protected
     * @param {any} object
     * @returns {boolean}
     */
    is_plain_object( object ) 
    { 
        let v = object;
        return (!!v && typeof v === 'object' && (v.__proto__ === null || v.__proto__ === Object.prototype));
    }
}

/**
 * Classes requiring access to the DOM
 */

/**
 * Mapping scalar values to form elements between DOM and the App.
 * Elements that carry a value attribute, can provide the respetive path by setting
 * the attribute "data-value" accordingly.
 */
class DOMValueMapper extends ChangedListener
{

    /**
     * @param {DOMApp} app 
     */
    constructor( app )
    {
        super(app);
        
        /** 
         * @type {Element|null}
         * @protected
        */
        self.changed_element = null;

        // add changed listener for form controls
        document.addEventListener( "change", function(event) 
        { 
            if( "value" in event.target.dataset )
            {
                try 
                {
                    let path = event.target.dataset.value.split( this.get_app().get_delimiter() );
                    this.changed_element = event.target;                    
                    this.get_app().set( path, event.target.value );
                } 
                catch (error)
                {
                    this.changed_element = null;
                    throw error;
                }
            }
        }.bind(this) );
    }

    /**
     * @returns {DOMApp}
     */
    get_app()
    {
        return this.app;
    }

    /**
     * 
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) 
    {
        let elements = document.querySelectorAll(`*[data-value="${path.join( this.get_app().get_delimiter() )}"]`);     
        let html_value = value == null || value == undefined ? "" : String(value);           
        for( let element of elements )
        {
            if( element == this.changed_element )
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
}


/**
 * Mapping scalar values to any element carrying the data-html attribute
 */
class DOMHtmlMapper extends ChangedListener
{

    /**
     * @param {DOMApp} app 
     */
    constructor( app )
    {
        super(app);  
    }

    /**
     * @returns {DOMApp}
     */
    get_app()
    {
        return this.app;
    }

    /**
     * 
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) 
    {
        let html_value = value == null || value == undefined ? "" : String(value);  
        let str_path = path.join( this.get_app().get_delimiter() );
        let elements = document.querySelectorAll(`[data-html="${str_path}"]`);        
        for( let element of elements )
            element.innerHTML = html_value;
    }
}


/**
 * Mapping scalar values to any element carrying the data-display and data-display-type and optionally data-display-matches or data-display-matches-not attributes
 */
class DOMDisplayMapper extends ChangedListener
{

    /**
     * @param {DOMApp} app 
     */
    constructor( app )
    {
        super(app);  
        let elements = document.querySelectorAll(`*[data-display-if]`);                 
        for( let element of elements )
            element.style.display = "none";  
    }

    /**
     * @returns {DOMApp}
     */
    get_app() { return super.get_app(); }

    /**
     * 
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) 
    {
        let str_path = path.join( this.get_app().get_delimiter() );
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
}


/**
 * Mapping objects to elements with data-table and data-template-id attributes
 */
class DOMTableMapper extends ChangedListener
{

    /**
     * @param {DOMApp} app 
     */
    constructor( app )
    {
        super(app);  

        let elements = document.querySelectorAll(`*[data-table]`);                 
        for( let element of elements )            
            element.firstChild.style.display = "none";  
    }

    /**
     * @returns {DOMApp}
     */
    get_app() { return super.get_app(); }

    /**
     * 
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) 
    {
        let last_name = path.length > 0 ? path.pop() : null;
        if( last_name )
        {
            let str_path = path.join( this.get_app().get_delimiter() );
            let elements = document.querySelectorAll('*[data-table="'+str_path+'"]');

            for( const element of elements )
            {
                // delete case
                if( value == null )
                {

                    var children = element.children;
                    for(var i=0; i<children.length; i++)
                    {
                        var child = children[i];
                        if( child.getAttribute("name") == last_name )
                        {
                            child.remove();
                            break;
                        }
                    }

                }
    
                // added case
                else
                {
                    let first_child = element.firstChild;
                    let new_child = first_child.cloneNode(true);
                    new_child.setAttribute("name", last_name);
                    let display_type = "displayType" in new_child.dataset ? new_child.dataset.displayType : "block";
                    new_child.style.display = display_type;
                    element.append( new_child );
                }
            }
        }        
    }
}


/**
 * Mapping scalar values to any element carrying the data-display and (data-visible-if-exists or ( data-visible-if and data-visible-matches ) ) attribute
 */
class DOMVisibilityMapper extends ChangedListener
{

    /**
     * @param {DOMApp} app 
     */
    constructor( app )
    {
        super(app);  
        let elements = document.querySelectorAll(`*[data-visible-if]`);                 
        for( let element of elements )
            element.style.visibility = "hidden";  
    }

    /**
     * @returns {DOMApp}
     */
    get_app() { return super.get_app(); }

    /**
     * 
     * @param {Array<string>} path
     * @param {*} value 
     * @param {*} old_value 
     * @returns {void}
     */
    changed( path, value, old_value ) 
    {
        let str_path = path.join( this.get_app().get_delimiter() );
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
}

/**
 * SaveInLocalStorage
 */
class SaveInLocalStorage extends Action
{


    /**
     * @returns {SaveInLocalStorage}
     */
    constructor( app )
    {
        super( app, "save_to_local_storage" );
    }

    /**
     * @returns {void}
     */
    exec() 
    {
        let storage_key = this.get_app().get("storage_key");
        if( storage_key == null )
        {
            console.error(`"storage_key" not set in App. Cannot proceed in ${this.get_name()}`);
            return;
        }

        localStorage.setItem( String(storage_key), this.app.to_json() );   
        let disable_local_storage_alert = this.get_app().get("disable_local_storage_alert");
        if( disable_local_storage_alert != true )
            alert("Saved!");    
    }
}

/**
 * LoadFromLocalStorage
 */
class LoadFromLocalStorage extends Action
{


    /**
     * @returns {LoadFromLocalStorage}
     */
    constructor( app )
    {
        super( app, "load_from_local_storage" );
    }

    /**
     * @returns {void}
     */
    exec() 
    {
        let storage_key = this.get_app().get("storage_key");
        if( storage_key == null )
        {
            console.error(`"storage_key" not set in App. Cannot proceed in ${this.get_name()}`);
            return;
        }
        let json_string = localStorage.getItem( String(storage_key) );
        if( json_string )
            this.app.from_json( [], json_string );  
    }
}


/**
 * SaveInLocalStorage
 */
class RemoveFromLocalStorage extends Action
{

    /**
     * @returns {RemoveFromLocalStorage}
     */
    constructor( app )
    {
        super( app, "remove_from_local_storage" );
    }


    /**
     * @returns {void}
     */
    exec() 
    {
        let storage_key = this.get_app().get("storage_key");
        if( storage_key == null )
        {
            console.error(`"storage_key" not set in App. Cannot proceed in ${this.get_name()}`);
            return;
        }

        localStorage.removeItem( String(storage_key) );   
        let disable_local_storage_alert = this.get_app().get("disable_local_storage_alert");
        if( disable_local_storage_alert != true )
            alert("Saved!");    
    }
}


/**
 * SaveInLocalStorage
 */
class SaveToHtmlDocument extends Action
{

    /**
     * @returns {SaveToHtmlDocument}
     */
    constructor( app )
    {
        super( app, "save_to_html_document" );
    }


    /**
     * @returns {DOMApp}
     */
    get_app() { return super.get_app(); }


    /**
     * @returns {void}
     */
    exec() 
    {
        let json_element = document.getElementById("data");
        if( json_element == null )
        {
            json_element = document.createElement("div");
            json_element.style.display = "none";
            json_element.id = "data";
            document.body.appendChild( json_element );
        }
        //json_element.dataset.json = this.get_app().to_json();
        json_element.innerHTML = this.get_app().to_json();

        var element = document.createElement('a');
        var markup = document.documentElement.outerHTML;
        element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent( markup ) );

        var url = window.location.pathname;
        var filename = url.substring(url.lastIndexOf('/')+1);
        element.setAttribute('download', filename);
        
        element.style.display = 'none';
        document.body.appendChild(element);
        
        element.click();
        
        document.body.removeChild(element);
    }
}

/**
 * Class for basic data management (set/get)
 */
class DOMApp extends App
{


    /**
     * @returns {DOMApp}
     */
    constructor( delimiter="." )
    {   
        // check delimiter
        if( !( typeof delimiter == "string" && delimiter.length > 0 ) )
        {
            console.warn(`"delimiter": Expected non-empty string, got ${delimiter}, falling back to "."`);
            delimiter = ".";
        }

        super();


        // set defaults
        this.delimiter = ".";
        

        // add known AppObjects
        new DOMValueMapper(this);
        new DOMDisplayMapper(this);
        new DOMHtmlMapper(this);
        new DOMVisibilityMapper(this);


        // actions
        new SaveInLocalStorage(this);
        new LoadFromLocalStorage(this);
        new RemoveFromLocalStorage(this);
        new SaveToHtmlDocument(this);

                
        // map "data-actions" to Actions
        document.addEventListener( "click", function(event) 
        { 
            if( "action" in event.target.dataset )
            {
                event.preventDefault();
                let action = this.get_action( event.target.dataset.action );
                if( !action )
                {
                    console.error(`Unknown action "${ event.target.dataset.action}"`);
                    return;
                }
                
                action.exec();
            }
        }.bind(this) );        
    }

    /**
     * @param {string} delimiter 
     * @returns {str}
     */
    get_delimiter() { return this.delimiter; }

}

// Running on Node.js
if(typeof window === 'undefined' )
{
    module.exports.App = App;
    module.exports.ChangedListener = ChangedListener;
    module.exports.Action = Action;
    module.exports.Validator = Validator;
}