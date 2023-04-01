
/**
 * A file system like database
 */
class Db2
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
        this.crypto;
    }     
    /**
     * 
     * @returns {string} 
     * @public
    */
    create_uuid()
    {
        if( !this.crypto )
            this.crypto = typeof window === 'undefined' ? require('crypto') : crypto;
        return this.crypto.randomUUID();
    }
    /**
     * 
     * @param {string[]} names - the names to change to
     * @returns {boolean}
     * @public
    */
    cd( ...names ) 
    {
        for( const name of names )
            if( !( this.is_valid_name(name) && this._cd(name) ) )
                return false;
        return true;
    }
    /**
     * 
     * @param {string} name - the name to check
     * @returns {boolean}
     * @public
    */
    is_valid_name( name ) 
    { 
        let expected_name_value = this.expected_name_value( name );
        if( expected_name_value )
            console.error(`Invalid "name": Expected ${expected_name_value}, got ${name}`);
    }
    /**
     * 
     * @param {string} name - the name to check
     * @returns {string|undefined}
     * @public
    */
    expected_name_value( name ) 
    { 
        return typeof name == "string" && name.length > 0 ? null : `typeof name == "string" && name.length > 0`; 
    }
    /**
     * 
     * @param {string} delimiter - the names to change to
     * @returns {string[]|string} - if delimiter is set returns a string otherwise an array of names
     * @public
    */
    path( delimiter=null ) 
    {
        return delimiter ? this._path().join( String(delimiter) ) : this._path();        
    }
    /**
     * 
     * @param {string} name - the name to change to, the name "" denotes the top level
     * @returns {boolean}
     * @public
    */
    _cd( name ) { throw new Error("Not implemented!"); }
    /**
     * 
     * @returns {string[]} - the current path of this Db
     * @public
    */
    _path( name ) { throw new Error("Not implemented!"); }
    /**
     * 
     * @param {string} name - the name to set
     * @param {any} object - if value is a plain object this is considered a directory, if null it means deletion, otherwise it means it is a value to store
     * @returns {boolean}
     * @public
    */
    _set( name, object ) { throw new Error("Not implemented!"); }
    /**
     * 
     * @param {string} name - the name to retrieve
     * @returns {any|null} - null if the value does not exist 
     * @public
    */
    _get( name ) { throw new Error("Not implemented!"); }
}

// export for Node
if(typeof window === 'undefined' )
{
    module.exports = Db2;
}