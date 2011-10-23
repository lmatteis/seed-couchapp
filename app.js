 var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = 
  { _id:'_design/app'
  , rewrites : 
    [ {from:"/", to:'index.html'}
    , {from:"/api", to:'../../'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {};

ddoc.views.updated = {
  map: function (doc) {
    if(doc.ACCENUMB && doc.CROPNAME)
      emit(doc.ACCENUMB, doc.CROPNAME);
  }
};

ddoc.views.centers = {
  map: function (doc) {
    if(doc.INSTCODE)
      emit(doc.INSTCODE, 1);
  },
  reduce: "_sum"
};

ddoc.views.search = {
  map: function(doc) {
    if(doc.ACCENUMB)
      emit(doc.ACCENUMB, 1);
/*
    for(var i in doc) {
      var value = doc[i]
          , words = value.split(" ")

      words = words.map(function(w){
        return w.trim().toLowerCase();
      });

      words.forEach(function(w) {
        emit(w, doc._id);
      });
    }
*/
  }
};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  } 
}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;
