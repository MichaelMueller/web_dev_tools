
/**
 * A file system like database
 */
class Db
{
    /**
     * @param {function} uuid_generator
     * @param {boolean} debug whether to print debug messages
     */
    constructor()
    {           
        /**
         * crypto moduke
         * @type {object}
         * @protected
         */
        this.crypto = typeof window === 'undefined' ? require('crypto') : crypto;
        /**
         * @type {function}
         * @protected
         */
        this.uuid_generator = function() { return this.crypto.randomUUID(); };
        /**
         * @type {boolean}
         * @protected
         */
        this.debug = false;
        /**
         * @type {object}
         * @protected
         */
        this.data = {};
        /**
         * @type {string[]}
         * @protected
         */
        this.current_path = [];
        /**
         * @type {object}
         * @protected
         */
        this.cwd = this.data;
        /**
         * @type {Array.<Object>}
         * @protected
         */
        this.validators = [];
        /**
         * @type {Array.<Object>}
         * @protected
         */
        this.listeners = [];
    } 
    /**
     * 
     * @param {Object} uuid_generator
     * @returns {boolean} 
     * @public
    */
    set_uuid_generator( uuid_generator )
    {
        if( !(uuid_generator instanceof Function) )
        {
            console.error(`"uuid_generator": expected be function, got ${uuid_generator}`);
            return false;
        }
        this.uuid_generator = uuid_generator;
        return true;
    }
    /**
     * 
     * @param {boolean} debug
     * @returns {boolean} 
     * @public
    */
    set_debug( debug )
    {
        if( typeof debug == "boolean" )
        {
            this.dbg(`setting "debug" to ${debug}`);
            this.debug = debug;
            return true;
        }
        else
        {
            console.error(`"debug" must be boolean, not ${debug}`);
            return false;
        }
    }    
    /**
     * 
     * @param {Object} validator
     * @returns {boolean} 
     * @public
    */
    add_validator( validator )
    {
        if( typeof validator != "object" )      
        {
            console.error(`"validator": must be object, not ${validator}`);
            return false;
        }      
        if( this.listeners.includes( validator ) )      
        {
            console.error(`"validator": already added as validator`);
            return false;
        }      
        let has_required_functions = false;
        let required_functions = ["is_valid_value", "dir_can_be_created", "can_be_removed"];
        for( const required_function of required_functions )
            has_required_functions = has_required_functions || required_function in validator && validator[required_function] instanceof Function;

        if( !has_required_functions )      
        {
            console.error(`"validator": must contain at least one of these functions: ${required_functions}`);
            return false;
        }      

        this.dbg(`adding new validator`);
        this.validators.push( validator );
        return true;                
    }    
    /**
     * 
     * @param {Object} listener
     * @returns {boolean} 
     * @public
    */
    add_listener( listener )
    {
        if( typeof listener != "object" )      
        {
            console.error(`"listener": must be object, not ${listener}`);
            return false;
        }      
        if( this.listeners.includes( listener ) )      
        {
            console.error(`"listener": already added as listener`);
            return false;
        }      
        let has_required_functions = false;
        let required_functions = ["value_changed", "dir_created", "removed"];
        for( const required_function of required_functions )
            has_required_functions = has_required_functions || required_function in listener && listener[required_function] instanceof Function;

        if( !has_required_functions )      
        {
            console.error(`"listener": must contain at least one of these functions: ${required_functions}`);
            return false;
        }      

        this.dbg(`adding new listener`);
        this.listeners.push( listener );
        return true;
    }    
    /**
     * 
     * @param {string[]} names
     * @returns {boolean} 
     * @public
    */
    cd( ...names )
    {
        return this.vcd( names );
    }
    /**
     * 
     * @param {string[]} names
     * @returns {boolean} 
     * @public
    */
    vcd( names )
    {        
        if( names.length == 0 )
        {
            this.cwd = this.data;
            this.current_path = [];
            this.dbg(`Changed to top level path`);
        }
        else
        {
            for( const name of names )
            {                
                if( this.is_dir( name ) )
                {
                    this.cwd = this.internal_get( name );
                    this.current_path.push( name );
                    this.dbg(`Changed to path ${this.current_path}`);
                }   
                else    
                {
                    this.error(`Invalid path ${names}`);
                    return false; 
                }            
            }
        }
        return true;
    }
    /**
     * 
     * @param {string} path
     * @param {boolean} pop_last_name
     * @param {string} delimiter
     * @returns {string|undefined} - the last name of the path
     * @public
    */
    cd_by_path( path, pop_last_name, delimiter="." )
    {
        let last_name;
        if( typeof path != "string" || path.length == 0 )
            this.error(`Invalid path ${path}`);
        if( typeof delimiter != "string" || delimiter.length == 0 )
            this.error(`Invalid delimiter ${delimiter}`)
        
        let names = path.split( delimiter );
        last_name = pop_last_name ? names.pop() : names[names.length - 1];
        if( this.cd() && this.vcd( names ) )
            return last_name;
        else
            last_name = undefined;

        return last_name;
    }
    /**
     * 
     * @returns {boolean} 
     * @public
    */
    up()
    {
        if( this.current_path.length > 0 )
        {
            let parent_path = this.current_path.slice(0,-1);
            return this.cd() && this.vcd(parent_path);
        }
        return false;
    }
    /**
     * 
     * @param {string} name
     * @returns {boolean} 
     * @public
    */
    exists( name )
    {
        return this.internal_get( name, false ) != undefined;
    }
    /**
     * 
     * @param {string} name
     * @returns {boolean} 
     * @public
    */
    clear()
    {
        let clear = true;
        for( let key of this.names() )
            clear = clear && this.rm( key );
        return clear;
    }
    /**
     * 
     * @param {string} name
     * @returns {boolean} 
     * @public
    */
    is_dir( name )
    {
        return this.is_plain_object( this.internal_get( name, false ) );
    }
    /**
     * 
     * @param {string} name
     * @param {any} value
     * @returns {boolean} 
     * @public
    */
    set( name, value )
    {
        // plain objects are managed by the db and cannot be set
        if( this.is_plain_object(value) )
        {
            this.error(`Invalid value "${value}" for "${name}", must not be a plain object`);
            return false;
        }
        
        // if we replace a directory we have to remove the dir first
        if( this.is_dir( name ) )
        {
            if( this.rm( name ) == false )
                return false;
        }

        // check if the value is valid
        for( let validator of this.validators )
            if( "is_valid_value" in validator )
                if( validator.is_valid_value( this, name, value ) === false )
                    return false;
        
        // get the previous value
        let prev_value = this.internal_get( name, false );
        
        this.dbg(`setting ${name} to ${value} in "${this.path()}"`);
        this.cwd[name] = value;
        
        for( let listener of this.listeners )
        {
            if( !( "value_changed" in listener ) )
                continue;

            try 
            {
                listener.value_changed( this, name, prev_value, value );
            } 
            catch (error) 
            {
                console.error( error.stack );
            }
        }        

        return true;
    }    
    /**
     * 
     * @param {string} path
     * @param {delimiter} path
     * @returns {boolean}
     * @public
     */
    mkdirs_py_path( path, delimiter="." )
    {
        let names = String(path).split( String(delimiter) );
        return this.vmkdirs(names);
    }   
    /**
     * 
     * @param {string[]} names
     * @returns {boolean}
     * @public
     */
    mkdirs( ...names )
    {
        return this.vmkdirs( names );
    }   
    /**
     * 
     * @param {string[]} names
     * @returns {boolean}
     * @public
     */
    vmkdirs( names )
    {
        for( const name of names )
        {
            if( this.is_dir( name ) )
                this.cd( name );
            else if( !this.mkdir( name, true ) )
                return false;
        }
        return true;
    }    
    /**
     * Interpret the array at ${name} as full path and follow it
     * 
     * @param {string} name
     * @returns {boolean}
     * @public
     */
    cd_link( name )
    {
        let names = this.get( name );
        if( !Array.isArray(names) )
        {
            this.error(`Expected array at ${name} to be treated as link, but found ${names}`);
            return false;
        }
        return this.cd() && this.vcd( names );
    }
    /**
     * 
     * @param {string|undefined|null} name
     * @param {boolean} cd
     * @returns {string|undefined}
     * @public
     */
    mkdir( name=undefined, cd=true )
    {
        if( !( name == null || name == undefined || ( typeof name == "string" && name.length > 0 ) ) )
        {
            this.error(`Invalid name ${name}`);
            return undefined;
        }
        
        if( !name || this.is_dir(name) == false )
        {
            if( !name )
            {
                name =this.uuid_generator();
                if( !(typeof name == "string" && name.length > 0 ) )
                {
                    this.error(`Invalid uuid ${name}. Please check uuid generator implementation`);
                    return false;
                }
            }
          
            for( let validator of this.validators )
                if( "dir_can_be_created" in validator )
                    if( validator.dir_can_be_created( this, name ) === false )
                        return undefined;
    
            let prev_value = this.internal_get( name, false );
            this.dbg(`creating directory ${name} in "${this.path()}"`);
            this.cwd[name] = {};
    
            // inform listeners
            for( let listener of this.listeners )
            {
                if( !( "dir_created" in listener ) )
                    continue;
    
                try 
                {
                    listener.dir_created( this, name, prev_value );
                } 
                catch (error) 
                {
                    console.error( error.stack );
                }
            }        
        }      

        if( cd  == true )
            return this.cd( name );
        
        return name;
    }
    /**
     * 
     * @param {string} name
     * @returns {boolean}
     * @public
     */
    rm( name )
    {
        if( this.exists( name ) )
        {
            for( let validator of this.validators )
                if( "can_be_removed" in validator )
                    if( validator.can_be_removed( this, name ) === false )
                        return false;        

            let prev_value = this.internal_get( name, false );

            /*
            if( this.is_plain_object(prev_value) == false )
                if( this.set( name, undefined ) == false )
                    return false;
                    */

            this.dbg(`removing "${name}" with value "${prev_value}" in "${this.path()}"`);
            delete this.cwd[name];

            // inform listeners
            for( let listener of this.listeners )
            {
                if( !( "removed" in listener ) )
                    continue;
    
                try 
                {
                    listener.removed( this, name, prev_value );
                } 
                catch (error) 
                {
                    console.error( error.stack );
                }
            }    
            return true;
        }
        else
            console.error(`"${name}" not found`);
        return false;
    }
    /**
     * 
     * @param {string} name
     * @returns {any|undefined}
     * @public
     */
    get( name )
    {
        let value = this.internal_get( name,  true );
        if( this.is_plain_object(value) == true )    
        {
            this.error(`"${name}" is a directory and cannot be directly accessed`);
            value = undefined;
        }       
        
        return value;
    }
    /**
     * 
     * @returns {string[]}
     * @public
     */
    names()
    {
        return this.internal_names();
    }
    /**
     * 
     * @returns {boolean}
     * @public
     */
    path_matches( ...names )
    {
        let path_matches = names.length == this.current_path.length;
        if( path_matches )
            for( let i=0; i < names.length && path_matches; ++i )
                path_matches = path_matches && ( names[i] == "*" || names[i] == this.current_path[i] );
        return path_matches;
    }
    /**
     * 
     * @returns {string[]}
     * @public
     */
    path()
    {
        return this.current_path.slice(0);
    }
    /**
     * 
     * @param {string} delimiter
     * @param {string[]} names
     * @returns {string[]}
     * @public
     */
    str_path( delimiter = ".", ...names )
    {
        //console.log( this.current_path );
        names = this.current_path.concat(names);
        return names.join(delimiter);
    }
    /**
     * 
     * @param {number} indent
     * @returns {string}
     * @public
     */
    to_json( indent=null )
    {
        let json = JSON.stringify( this.cwd, null, indent );        
        return json;
    } 
    /**
     * 
     * @returns {object}
     * @public
     */
    to_object()
    {
        return JSON.parse( this.to_json() );
    }
    /**
     * 
     * @param {object} object
     * @returns {boolean}
     * @public
     */
    from_object( object )
    {
        let ok = true;
        let recursive_set;
        recursive_set = function( object ) 
        {
            for( let key in object )
            {
                let value = object[key];
                if( this.is_plain_object( value ) )
                {
                    if( this.is_dir( key ) )
                        ok = ok && this.cd( key );
                    else 
                        ok = ok && this.mkdir( key );
                    recursive_set( value );
                    ok = ok && this.up();
                }
                else
                    ok = ok && this.set( key, value );
            }
            return ok;
        }.bind( this );

        // ok = ok && this.cd();
        if( ok )
            ok = recursive_set(object);

        return ok;
    }
    /**
     * 
     * @param {string} json_string
     * @returns {boolean}
     * @public
     */
    from_json( json_string )
    {
        return this.from_object( JSON.parse( json_string ) );
    }
    /**
     * 
     * @param {any} object
     * @returns {boolean}
     * @protected
     */
    is_plain_object( object ) 
    { 
        let v = object;
        return (!!v && typeof v === 'object' && (v.__proto__ === null || v.__proto__ === Object.prototype));
        //return typeof object == "object" && object.constructor === Object; 
    }
    /**
     * 
     * @param {string} msg
     * @public
     */
    dbg( msg )
    {
        if( this.debug == true )
            console.log(`[${this.constructor.name}][DEBUG][${Date.now()}]: `+msg);
    }
    /**
     * 
     * @param {string} msg
     * @public
     */
    error( msg )
    {
        console.error(`[${this.constructor.name}][ERROR][${Date.now()}]: ${new Error(msg).stack}`);
    }
    /**
     * 
     * @returns {string[]}
     * @protected
     */
    internal_names()
    {
        return Object.keys( this.cwd );
    }
    /**
     * 
     * @param {string} name
     * @returns {any|Object|undefined}
     * @protected
     */
    internal_get( name, issue_error=true )
    {
        let value = name in this.cwd ? this.cwd[name] : undefined;
        if( value === undefined && issue_error )
            console.error(`${name} not found in path ${path}`);
        return value;
    }
    /**
     * 
     * @param {Db} db
     * @returns {boolean}
     * @protected
     */
    static test( db=null )
    {
        let tassert = function(condition, msg, stop=true) { 
            msg = `Checking "${msg}": ${condition ? "PASSED" : "FAILED" }`;

            if( !condition )
            {
                if( stop )
                    throw new Error(msg);
                else
                    console.error(`[${Db.name}][TEST] ${msg}!`);
            }
            else
                console.log(`[${Db.name}][TEST] ${msg}!`);
        };
        var count = 0;
        let uuid_generator = function() { return String(++count); };

        try 
        {
            console.log(`[${Db.name}][TEST] STARTING TESTS!`);
            if( !db )
            {
                db = new Db( uuid_generator );
                db.set_debug( true );
            }

            tassert( db.mkdir("users") == "users", `db.mkdir("users")  == true` );
            
            let generated_name = db.mkdir( undefined, false );
            tassert( typeof generated_name == "string", `typeof generated_name == "string"` );

            tassert( db.path().join(".") == "users", `db.path().join(".") == "users"` );
            tassert( db.cd("not_existent") == false, `db.cd("not_existent") == false` );
            tassert( db.cd(generated_name) == true, `db.cd(generated_name) == true` );
            tassert( db.path_matches("users", "*") == true, `db.path_matches("users", "*") == true` );
            
            tassert( db.set( "name", {} ) == false, `db.set( "name", {} ) == true`);
            tassert( db.set( "name", "Michael" ) == true, `db.set( "name", "Michael" ) == true`);
            tassert( db.set( "age", 39 ) == true, `db.set( "age", 39 ) == true`);

            tassert( db.up() == true, `db.up() == true`);
            tassert( db.path().join(".") == "users", `db.path().join(".") == "users"` );

            let new_generated_name = db.mkdir();
            tassert( new_generated_name != generated_name, `new_generated_name != generated_name` );
            tassert( db.set( "name", "Stefan" ) == true, `db.set( "name", "Kristina" ) == true`);
            tassert( db.set( "age", 29 ) == true, `db.set( "age", 39 ) == true`);
            tassert( db.cd() == true, `db.cd() == true`);

            let json = db.to_json();
            db.cd();
            tassert( db.str_path() == "", `db.str_path() == ""` );
            tassert( db.str_path( "/", "users", "test") == "users/test", `db.str_path( "/", "users", "test") == "users/test"` );
            tassert( db.up() == false, `db.up() == false`);
            tassert( db.clear() == true, `db.clear() == true`);
            tassert( db.names().length == 0, `db.names().length == 0`);
            tassert( db.from_json(json) == true, `db.from_json(json) == true`);
            tassert( db.to_json() == json, `db.to_json() == json`);
            
            let path = "users/"+generated_name+"/name";
            tassert( db.cd_by_path(path, false, "/") === undefined, `db.cd_by_path("${path}", false, "/") == false` );
            tassert( db.cd_by_path(path, true, "/") === "name", `db.cd_by_path("${path}", true, "/") === "name"` );
            tassert( db.get( "name" ) == "Michael", `db.get( "name" ) == "Michael"`);
            
            
            tassert( db.cd() == true, `db.cd() == true`);
            tassert( db.mkdirs("users", "sub_user", "michael", "rights"), `db.mkdirs("users", "sub_user", "michael", "rights")`);
            tassert( db.str_path() == "users.sub_user.michael.rights", `db.str_path() == "users.sub_user.michael.rights"` );

            console.log(`[${Db.name}][TEST] ALL TESTS PASSED!`);
            return true;           
        } 
        catch (error) 
        {            
            console.error(`[${Db.name}][TEST] ${ error.stack }!`);
            console.error(`[${Db.name}][TEST] TESTS FAILED!`);
            return false;
        }
    }
}

// export for Node
if(typeof window === 'undefined' )
{
    module.exports = Db;
}