/**
 * Node only moduke
 */
const Db = require('./Db.js');
const fs = require('fs');
/**
 * A file system like database
 */
class JsonFileDb extends Db
{
    /**
     * @param {string} root_dir
     */
    constructor( root_dir )
    {      
        super();     
        /**
         * crypto moduke
         * @type {string}
         * @protected
         */
        this.root_dir = root_dir; 
        this.add_listener( this );
    }
    /**
     * 
     * @returns {string[]}
     * @protected
     */
    internal_names()
    {        
        let names = [];
        let dir_path = this.file_path(null, null);
        try 
        {
            names = fs.readdirSync( dir_path );
            let json_file_names = [];
            for( let i=0; i < names.length; ++i )
                if( names[i].includes( ".json" ) )
                    json_file_names.push( names[i].replaceAll(".json", "") );
            names = json_file_names;  
        } 
        catch (err) 
        {
            console.error(`Cannot read directory ${dir_path}: ${err}`);
        }
        return names;
    }
    /**
     * 
     * @param {string} name
     * @returns {any|Object|undefined}
     * @protected
     */
    internal_get( name, issue_error=true )
    {
        let value = undefined;
        let file_path = this.file_path( name );
        let dir_path = this.file_path( name, null );
        try 
        {
            if( fs.existsSync(dir_path) && fs.lstatSync(dir_path).isDirectory() )
                value = {};
            else if( fs.existsSync(file_path) )
                value = JSON.parse( fs.readFileSync(file_path, { encoding:'utf8', flag:'r' }) );
                
        } 
        catch (err) 
        {
            this.error(`Cannot read ${file_path}: ${err}`);
        }
        if( value === undefined && issue_error )
            this.error(`${name} not found in path ${this.str_path()}`);

        return value;
    }
    /**
     * 
     * @param {Db} db
     * @param {string} name
     * @param {any} prev_value
     * @param {any} value
     * @returns {void}
     * @public
     */
    value_changed( db, name, prev_value, value ) 
    {   
        let file_path = this.file_path( name );
        try 
        {
            fs.writeFileSync( file_path, JSON.stringify(value) );
        } 
        catch (err) 
        {
            this.error(`Cannot write to ${file_path}: ${err}`);
        }
    }         
    /**
     * 
     * @param {Db} db
     * @param {string} name
     * @param {any|undefined} prev_value
     * @returns {void}
     * @public
     */
    dir_created( db, name, prev_value ) 
    { 
        let dir_path = this.file_path( name, null );
        try 
        {
            fs.mkdirSync( dir_path );
        } 
        catch (err) 
        {
            this.error(`Cannot create ${dir_path}: ${err}`);
        }
    }
    /**
     * 
     * @param {Db} db
     * @param {string} name
     * @param {any} prev_value
     * @returns {void}
     * @public
     */
    removed( db, name, prev_value ) 
    {
        let dir_path = this.file_path( name, null );
        let file_path = this.file_path( name, null );
        try 
        {
            if( fs.existsSync(file_path) )
                fs.unlinkSync( file_path );
            else
                fs.rmdirSync( dir_path, {recursive: true} );
        } 
        catch (err) 
        {
            this.error(`Cannot create ${dir_path}: ${err}`);
        }
    }
    /**
     * 
     * @param {string|null} name
     * @param {string|null} ext
     * @returns {string}
     * @public
     */
    file_path( name, ext=".json" ) 
    {        
        return this.root_dir + "/" + this.current_path.join("/") + ( name ?  "/" + name + ( ext ? ext : "" ) : "" );
    }
}

// export for Node
module.exports = JsonFileDb;