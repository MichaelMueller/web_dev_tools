//import {Db} from './Db';
const Db = require('./Db.js');
const JsonFileDb = require('./JsonFileDb.js');

Db.test( new Db() );

let json_file_db = new JsonFileDb("../tmp");
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