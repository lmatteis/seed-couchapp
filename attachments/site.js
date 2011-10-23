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
    var skip = this.params.skip;
    if(!skip) skip = 0;
    var limit = 30;
    clearContent();
  $('div#content').html(
    '<div id="search-box">' +
      '<div id="search-box-title">Find accessions...</div>' +
      '<div id="search-box-input">' +
        '<form id="search"><input id="search-input" /></form>' +
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
      '<br /><div id="skip"><a href="#/skip/'+(parseInt(skip, 10) + limit)+'">More</a></div>' +
    '</div>'
  );
  request({url:'api/_all_docs?limit=0'}, function (err, resp) {
    $('div#totals').html('<a href="/#/_browse/all">' + (resp.total_rows - 1) +' total accessions</a>')
  })

  request({
    url:'api/_design/app/_view/updated?'+param({
            limit: limit,
            descending: true,
            skip: skip
        })
    }, function (err, resp) {
    resp.rows.forEach(function (row) {
      $('<div class="top-package"></div>')
      .append('<div class="top-package-title"><a href="#/accessions/'+row.id+'">'+row.key+'</a></div>')
      .append('<div class="top-package-updated">'+row.value +'</div>')
      .append('<div class="spacer"></div>')
      .appendTo('div#latest-packages')
    });
  });
 
  request({url:'api/_design/app/_view/centers?group=true'}, function (err, resp) {
    var results = {};
    resp.rows.forEach(function (row) {
        $('<div class="top-package"></div>')
        .append('<div class="top-package-title"><a href="#/centers/'+row.key+'">'+row.key+'</a></div>')
        .append('<div class="top-package-dep">'+row.value+'</div>')
        .append('<div class="spacer"></div>')
        .appendTo('div#top-dep-packages')
    });
  });

  $("#search").submit(function(e){
    var searchVal = $("#search-input").val();
    var qs = param({
      startkey: JSON.stringify(searchVal),
      endkey: JSON.stringify(searchVal + "ZZZZZZZZZZZZZZZZZZZ"),
      limit: 25
    });
    request({url:'api/_design/app/_view/search?' + qs}, function(err, resp) {
      $("#main-container").html("");
      resp.rows.forEach(function (row) {
        $("#main-container").append("<a href='#/accessions/"+row.id+"'>"+row.key+"</a><br />");
      });
    });
    e.preventDefault();
    e.stopPropagation();
  });
};

app.about = function() {
    clearContent();
    // get commits list of README.md so we can get the latest commit which is the first in the array
    $.getJSON("https://github.com/api/v2/json/commits/list/lmatteis/seed-couchapp/master/README.md?callback=?", function(data) {
        var latest_commit = data.commits[0],
            latest_commit_id = latest_commit.id;
        // now  get the README.md blob
        $.getJSON("https://github.com/api/v2/json/blob/show/lmatteis/seed-couchapp/"+latest_commit_id+"/README.md?callback=?", function(data) {
            // convert markdown to html
            var md = data.blob.data;
            var converter = new Showdown.converter();
            var html = converter.makeHtml(md);

            $('div#content').html('<div id="main-container">'+html+'</div>');
        });
    });
};

app.showAccession = function() {
    var id = this.params.id;
    clearContent();
    var package = $('<div id="main-container"></div>');
    $('div#content').html(package);
    request({url:'/api/'+id}, function (err, doc) {
        var skip = ["_id", "_rev"];
        package.append("<div class='package-title'>"+doc.ACCENUMB+"</div>");
        package.append('<div class="pkg-link"><a href="#/">'+doc.INSTCODE+'</a></div>');
        package.append('<div class="spacer"></div>');
        var $table = $("<table></table>");
        package.append($table);
        for(var key in doc) {
            var value = doc[key];
            if($.inArray(key, skip) > -1) continue;
            $table.append('<tr><td><a href="#/">'+key+'</a></td><td>'+value+'</td></tr>');
        }
    });
};

$(function () { 
  app.s = $.sammy(function () {
    // Index of all databases
    this.get('', app.index);
    this.get("#/", app.index);
    this.get("#/skip/:skip", app.index);
    this.get("#/_about", app.about);
    this.get("#/accessions/:id", app.showAccession);
  })
  app.s.run();
});
