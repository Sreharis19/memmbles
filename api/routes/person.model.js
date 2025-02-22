var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
const config = require('config')
mongoose.connect('mongodb://' + config.get('db.host') + ':' + config.get('db.port') + '/memmbles')
var personSchema = Schema({
    is_root: { type: Boolean, default: false },
    familyId: { type: String },
    is_patner: { type: Boolean, default: false },
    f_pro_image: {type: String},
    pimage: { type: String },
    fname: {type: String},
    data: { name: { type: String }, node_open: { type: Boolean, default: false }, deletable: { type: Boolean, default: false },pname: { type: String } },
    parent: { type: ObjectId, ref: 'Person' },
    children: [{ type: ObjectId, ref: 'Person' }]
});
personSchema.set('collection', 'people')

var Person = mongoose.model('Person', personSchema);
module.exports = Person;
