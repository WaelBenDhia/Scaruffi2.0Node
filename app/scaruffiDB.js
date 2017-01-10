const mysql = require('mysql')

var db_host = process.env.MYSQL_HOST || "localhost"
var db_user = process.env.MYSQL_USER || "wael"
var db_password = process.env.MYSQL_PASSWORD || ""
var db_database = process.env.MYSQL_DATABASE || "scaruffi"

const pool = mysql.createPool({
	connectionLimit : 100,
	host : db_host,
	user : db_user,
	password : db_password,
	database : db_database,
	debug : false
});

var getConnection = function(){
	return new Promise(function(fulfill, reject){
		pool.getConnection(function(err, connection){
			if(err){
				reject(err)
				connection.release()
			}else
				fulfill(connection)
		})
	})
}

var filterForSql = function(string){
	return string.replace(/'/, "\\'")
}

const SORT_BY_RATING = 0;
const SORT_BY_DATE = 1;
const SORT_BY_ALBUM_NAME = 2;
const SORT_BY_BANDNAME = 3;

var parseBandFromRow = function(row){
	var band = {
		name: row.name,
		url: row.partialUrl,
		bio: row.bio,
		fullUrl: `http://scaruffi.com/${row.partialUrl}`,
		albums: [],
		relatedBands: []
	}
	return band
}

var parseAlbumFromRow = function(row){
	var album = {
		name: row.name,
		year: row.year,
		rating: row.rating,
		band: {}
	}
	return album
}

var getSortByAsString = function(sortBy, albumSymbol, bandSymbol){
	var ret = "";
	switch (parseInt(sortBy)) {
	case SORT_BY_RATING:
		ret = albumSymbol+".rating";
		break;
		
	case SORT_BY_DATE:
		ret = albumSymbol+".year";
		break;
		
	case SORT_BY_ALBUM_NAME:
		ret = albumSymbol+".name";
		break;
		
	case SORT_BY_BANDNAME:
		ret = bandSymbol+".name";
		break;

	default:
		ret= "DEFAULT"
		break;
	}
	return ret;
}

var getRelatedBands = function(band, callback){
	var query = `select * from bands INNER JOIN bands2bands ON bands.partialUrl = bands2bands.urlOfRelated where bands2bands.urlOfBand ='${filterForSql(band.url)}'`;
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			for( i = 0; i < rows.length; i++ ){
				var relBand = parseBandFromRow(rows[i])
				relBand.bio = ''
				band.relatedBands.push(relBand)
			}
			callback(band)
		})
		con.release()
	},function(err){
		console.log(err)
	})
}

var getAlbums = function(band, callback){
	var query = `select * from albums where band ='${filterForSql(band.url)}'`
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			for( i = 0; i < rows.length; i++ ){
				band.albums.push(parseAlbumFromRow(rows[i]))
			}
			callback(band)
		})
		con.release()
	},function(err){
		console.log(err)
	})
}

module.exports.getBand = function(partialUrl, callback){
	var query = `select * from bands where partialUrl ='${filterForSql(partialUrl)}'`;
	var firstBand
	var finalCallback = function(band){
		callback(band)
	}
	var callbackFromRelatedBands = function(band){
		firstBand = band
		getAlbums(firstBand, finalCallback)
	}
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			firstBand = parseBandFromRow(rows[0])
			getRelatedBands(firstBand, callbackFromRelatedBands)
		})
		con.release()
	}, function(err){
		console.log(err)
	})
}

module.exports.getRatingDistribution = function(callback){
	var query = `SELECT floor(albums.rating*2)/2 as rating, count(*) as count FROM albums group by floor(albums.rating*2)/2;`;
	var disrib = {}
	getConnection().then(function(con){
		console.log("Result of getConnection : " + con)
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			for(var i = 0; i < rows.length; i++){
				var row = rows[i]
				disrib[row.rating.toFixed(1)] = row.count
			}
			callback(disrib)
		})
		con.release()
	}, function(err){
		console.log(err)
	})
}

module.exports.getBandCount = function(callback){
	var query = `select count(*) as count FROM bands;`;
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			callback(rows[0].count)
		})
		con.release()
	}, function(err){
		console.log(err)
	})
}

module.exports.getBandsInfluential = function(callback){
	var query = `select count(b2b.urlOfBand) as inf, b.name, b.partialUrl FROM bands b inner join bands2bands b2b on b.partialUrl = b2b.urlOfRelated group by b2b.urlOfRelated order by inf desc limit 21`;
	var bands = []
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			for( i = 0; i < rows.length; i++ ){
				var band = parseBandFromRow(rows[i])
				band.bio = ''
				bands.push(band)
			}
			callback(bands)
		})
		con.release()
	}, function(err){
		console.log(err)	
	})
}

module.exports.searchAlbums = function(req, callback){
	var query = "select a.name as name, a.year as year, a.rating as rating, b.name as bandname, b.partialUrl as bandurl from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + filterForSql(req.name) + "')) or instr(lower(b.name), lower('" + filterForSql(req.name) + "'))) ") 
		+ "order by " + getSortByAsString(req.sortBy, "a", "b") + (req.sortOrderAsc ? " asc " : " desc ") 
		+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var albums = []
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			for( i = 0; i < rows.length; i++ ){
				var album = parseAlbumFromRow(rows[i])
				album.band = {
					name: rows[i].bandname,
					url: rows[i].bandurl,
					fullurl: `http://scaruffi.com/${rows[i].bandurl}`
				}
				albums.push(album)
			}
			callback(albums)
		})
		con.release()
	}, function(err){
		console.log(err)	
	})
}

module.exports.searchAlbumsCount = function(req, callback){
	var query = "select count(*) as count from albums a inner join bands b on b.partialUrl = a.band where a.rating between "
		+ req.ratingLower + " and " + req.ratingHigher + " and "
		+ "(a.year between " + req.yearLower + " and " + req.yearHigher
		+ (req.includeUnknown ? " or a.year = 0" : "") + ") " 
		+ (!req.name ? "" : "and ( instr(lower(a.name), lower('" + filterForSql(req.name) + "')) or instr(lower(b.name), lower('" + filterForSql(req.name) + "'))) ") + ";";

	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			callback(rows[0].count)
		})
		con.release()
	}, function(err){
		console.log(err)	
	})

}

module.exports.searchBands = function(req, callback){
	var query = "select b.partialUrl as partialUrl, b.name as name from bands b where "
				+ "instr(lower(b.name), lower('" + filterForSql(req.name) + "')) " 
				+ " order by b.name "
				+ "limit " + (req.page * req.numberOfResults) + "," + req.numberOfResults + ";";

	var bands = []
	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			for( i = 0; i < rows.length; i++ ){
				var band = parseBandFromRow(rows[i])
				bands.push(band)
			}
			callback(bands)
		})
		con.release()
	}, function(err){
		console.log(err)	
	})
}

module.exports.searchBandsCount = function(req, callback){
	var query = "select count(*) as count from bands b where "
				+ "instr(lower(b.name), lower('" + filterForSql(req.name) + "')) " + ";";

	getConnection().then(function(con){
		con.query(query, function(err, rows){
			if(err)
				console.log(err)
			callback(rows[0].count)
		})
		con.release()
	}, function(err){
		console.log(err)	
	})

}