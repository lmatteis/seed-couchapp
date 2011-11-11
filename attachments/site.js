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
    $('div#content').html('');

    $('div#totals').html('')
}

function bindSearch(query){
  $('div#content').append(
    '<div id="search-box">' +
      '<div id="search-box-title">Find accessions...</div>' +
      '<div id="search-box-input">' +
        '<form id="search"><input id="search-input" value="'+(query || "")+'"/></form>' +
      '</div>' +
    '</div>');

  $("#search").submit(function(e){
    var searchVal = $("#search-input").val();
    window.location.hash = "/search/"+$.trim(searchVal);
    e.preventDefault();
    e.stopPropagation();
  });
}


var app = {};
app.index = function () {
    var skip = this.params.skip;
    if(!skip) skip = 0;
    var limit = 30;
    clearContent();
    bindSearch();
  $('div#content').append(
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

};

app.search = function() {
  var query = this.params.query;
  var skip = this.params.skip;
  if(!skip) skip = 0;
  var limit = 30;
  clearContent();
  bindSearch(query);
  var $main = $("<div id='main-container'></div>");
  $('div#content').append($main);

  var qs = param({
    startkey: JSON.stringify(query),
    endkey: JSON.stringify(query + "ZZZZZZZZZZZZZZZZZZZ"),
    limit: limit,
    skip: skip
  });
  request({url:'api/_design/app/_view/search?' + qs}, function(err, resp) {
    resp.rows.forEach(function (row) {
      $main.append("<a href='#/accessions/"+row.id+"'>"+row.value+"</a><br />");
    });
    $main.append('<br /><div id="skip"><a href="#/search/'+query+'/skip/'+(parseInt(skip, 10) + limit)+'">More</a></div>');
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

var imgconv = {
  ciat: function (numspaces, path) {
    var spaces = "";
    for(var i=0; i<numspaces; i++) {
      spaces += " ";
    }
    var path = path.replace(" ", spaces);
    var url = "http://isa.ciat.cgiar.org/urg/foo/"+path;
    return "<img src='"+url+"' />";
  }
}
var mcpd = [
  "ACCENUMB",
  "ACCENAME",
  "COLLNUMB",
  "GENUS",
  "SPECIES",
  "ACQDATE",
  "ORIGCTY",
  "LATITUDE",
  "LONGITUDE",
  "CROPNAME",
  "INSTCODE"
];

function tripreport(str) {
  var links = str.match(/\(\'(.*)\'\)/);
  if(links.length) {
    return "<a href='"+links[1]+"' target='_blank'>"+links[1]+"</a>";
  } else {
    return "No trip report found";
  }
}

function addRow($table, key, value) {
  if(key == "Seed/Plant" || key == "(Photo) Seed/Plant" || key == "(Photo) Flower") {
    value = imgconv.ciat(2, value);
  } else if (key == "(Allele position for the Locus EST-1) Ref. Gel" ) {
    value = imgconv.ciat(1, value);
  } else if (key == "(Allele position for the Locus EST-1) Gel") {
    value = imgconv.ciat(3, value);
  }
  if(key == "(Collection information) Trip report") {
    value = tripreport(value);
  }
  $table.append('<tr><td><a href="#/">'+key+'</a></td><td>'+value+'</td></tr>');
}

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
        // first do the mcpd
        for(var i=0; i<mcpd.length; i++) {
          if(doc[mcpd[i]]) {
            addRow($table, mcpd[i], doc[mcpd[i]]);
          }
        }
        // then do the rest, and skip MCPD (so MCPD shows first)
        for(var key in doc) {
            var value = doc[key];
            if($.inArray(key, skip) > -1) continue;
            if($.inArray(key, mcpd) > -1) continue;
            addRow($table, key, value);
        }
    });
};

app.showCenterAccessions = function() {
    var limit = 25;
    var skip = this.params.skip;
    if(!skip) skip = 0;
    var center_id = this.params.id;
    clearContent();
    var package = $('<div id="main-container"></div>');
    $('div#content').html(package);
    request({url:'/api/_design/app/_view/accessionsByCenter?'+param({
      key: JSON.stringify(center_id),
      limit: limit,
      skip: skip
    })}, function (err, resp) {
      $main = $("#main-container");
      $main.html("");
      resp.rows.forEach(function (row) {
        $main.append("<a href='#/accessions/"+row.id+"'>"+row.value+"</a><br />");
      });
      $main.append('<br /><div id="skip"><a href="#/centers/'+center_id+'/skip/'+(parseInt(skip, 10) + limit)+'">More</a></div>');
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
    this.get("#/centers/:id/skip/:skip", app.showCenterAccessions);
    this.get("#/centers/:id", app.showCenterAccessions);

    this.get("#/search/:query/skip/:skip", app.search);
    this.get("#/search/:query", app.search);
  })
  app.s.run();

});
