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

ddoc.views.accessionsByCenter = {
  map: function (doc) {
    if(doc.INSTCODE && doc.ACCENUMB)
      emit(doc.INSTCODE, doc.ACCENUMB);
  }
};

var variety = "(Taxonomic information) Variety";
ddoc.views.accByVariety = {
  map: function (doc) {
    if (doc[variety]) {
      emit(doc[variety], 1);
    }
  }
};

ddoc.views.search = {
  map: function(doc) {
    if(doc.ACCENUMB) {
      emit(doc.ACCENUMB, doc.ACCENUMB);
    } 
    if (doc[variety]) {
      emit(doc[variety], doc.ACCENUMB);
    }
  }
};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  } 
}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;
