//import {Db} from './Db';
const Db = require('./Db.js');
const JsonFileDb = require('./JsonFileDb.js');

Db.test( new Db() );

let json_file_db = new JsonFileDb("../tmp");
json_file_db.set_debug(true);
console.log( json_file_db.names() );
console.log( json_file_db.get("test") );
//console.log( json_file_db.get("test2") );
//console.log( json_file_db.get("test_dir") );
console.log( json_file_db.mkdir("users") );
console.log( json_file_db.mkdir() );
json_file_db.set("age", 39);
json_file_db.set("name", "Michael");

console.log( json_file_db.get("age") );
console.log( json_file_db.get("name") );

validator = {
    "is_valid_value": function( db, name, value )
    {
        db.error( `cannot set ${name} to ${value} in ${db.str_path()}` );
        return false;
    },
    "dir_can_be_created": function( db, name )
    {
        db.error( `cannot crate ${name} in ${db.str_path()}` );
        return false;
    },
    "can_be_removed": function( db, name )
    {
        db.error( `cannot remove ${name} in ${db.str_path()}` );
        return false;
    }
}

json_file_db.add_validator( validator );
json_file_db.set("forbidden", 1);
console.log( json_file_db.str_path() );
json_file_db.rm( "age" );
validator.can_be_removed = function( db, name )
{
    return true;
}
json_file_db.rm( "age" );
console.log( json_file_db.exists( "age" ) );
console.log( json_file_db.get("age") );