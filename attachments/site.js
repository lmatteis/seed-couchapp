var request = function (options, callback) {
  options.success = function (obj) {
    callback(null, obj);
  }
  options.error = function (err) {
    if (err) callback(err);
    else callback(true);
  }
  if (options.data && typeof options.data == 'object') {
    options.data = JSON.stringify(options.data)
  }
  if (!options.dataType) options.processData = false;
  if (!options.dataType) options.contentType = 'application/json';
  if (!options.dataType) options.dataType = 'json';
  $.ajax(options)
}

$.expr[":"].exactly = function(obj, index, meta, stack){ 
  return ($(obj).text() == meta[3])
}

var param = function( a ) {
  // Query param builder from jQuery, had to copy out to remove conversion of spaces to +
  // This is important when converting datastructures to querystrings to send to CouchDB.
	var s = [];
	if ( jQuery.isArray(a) || a.jquery ) {
		jQuery.each( a, function() { add( this.name, this.value ); });		
	} else { 
	  for ( var prefix in a ) { buildParams( prefix, a[prefix] ); }
	}
  return s.join("&");
	function buildParams( prefix, obj ) {
		if ( jQuery.isArray(obj) ) {
			jQuery.each( obj, function( i, v ) {
				if (  /\[\]$/.test( prefix ) ) { add( prefix, v );
				} else { buildParams( prefix + "[" + ( typeof v === "object" || jQuery.isArray(v) ? i : "") +"]", v )}
			});				
		} else if (  obj != null && typeof obj === "object" ) {
			jQuery.each( obj, function( k, v ) { buildParams( prefix + "[" + k + "]", v ); });				
		} else { add( prefix, obj ); }
	}
	function add( key, value ) {
		value = jQuery.isFunction(value) ? value() : value;
		s[ s.length ] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
	}
}
function clearContent () {
    $('div#content').html('')
    $('div#totals').html('')
}


var app = {};
app.index = function () {
    clearContent();
  $('div#content').html(
    '<div id="search-box">' +
      '<div id="search-box-title">Find accessions...</div>' +
      '<div id="search-box-input">' +
        '<input id="search-input"></input>' +
      '</div>' +
    '</div>' +
    '<div id="main-container">' +
      '<div id="results"></div>' +
      '<div class="spacer"></div>' +
      '<div id="top-packages">' +
        '<div id="latest-packages"><div class="top-title">Latest Accessions</div></div>' +
        '<div id="top-dep-packages"><div class="top-title">Centers</div></div>' +
      '</div>' +
      '<div class="spacer"></div>' +
    '</div>'
  );
  request({url:'api/_all_docs?limit=0'}, function (err, resp) {
    $('div#totals').html('<a href="/#/_browse/all">' + (resp.total_rows - 1) +' total accessions</a>')
  })

  request({url:'api/_design/app/_view/updated?limit=15'}, function (err, resp) {
    resp.rows.forEach(function (row) {
      $('<div class="top-package"></div>')
      .append('<div class="top-package-title"><a href="#/'+row.id+'">'+row.key+'</a></div>')
      .append('<div class="top-package-updated">'+row.value +'</div>')
      .append('<div class="spacer"></div>')
      .appendTo('div#latest-packages')
    })
  })
  
};

app.about = function() {
    clearContent();
    request({url:'about.html', dataType:'html'}, function (e, resp) {
        $('div#content').html('<div id="main-container">'+resp+'</div>');
    });

};

app.showAccession = function() {
    /*
    clearContent();
    request({url:'about.html', dataType:'html'}, function (e, resp) {
        $('div#content').html('<div id="main-container">'+resp+'</div>');
    });
    */

};

$(function () { 
  app.s = $.sammy(function () {
    // Index of all databases
    this.get('', app.index);
    this.get("#/", app.index);
    this.get("#/_about", app.about);
    this.get("#/:id", app.showAccession);
  })
  app.s.run();
});
