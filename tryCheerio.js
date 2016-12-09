var fs = require('fs');
var request = require('request');
var URL = require('url-parse');
var mp3url = require("url");
var path = require("path");
var cheerio = require('cheerio');

var proxyUrl = "http://proxy.lbdevtest.lv:80/";
var MAX_PAGES_TO_VISIT = 10;


var urlSitemap = new URL('http://www.pasakas.net/sitemap.xml');
var dest = 'sitemap.xml';

try {
    stats = fs.statSync(dest);
    fs.unlink(dest);
} catch (e) {}

// var xml = fs.readFileSync(dest, 'ascii');
// var cheerio = require('cheerio'),
//     $ = cheerio.load(xml);

request({
    url: urlSitemap,
    method: 'GET',
    proxy: proxyUrl,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
    }
}, function(error, response, body) {
    // Check status code (200 is HTTP OK)
    //console.log("Status code: " + response.statusCode);
    if (response.statusCode !== 200) {
        return;
    }
    // Parse the document body
    var $ = cheerio.load(body);


    var urls = [];
    try {
        stats = fs.statSync('pasakas.txt');
        fs.unlink('pasakas.txt');
    } catch (e) {}

    $('loc').each(function(i, elem) {
        if ($(this).text().startsWith("http://www.pasakas.net/teikas") &&
            !$(this).text().match(/\/[a-zA-Z]\/+$/)) {
            //console.log($(this).text());
            fs.appendFileSync('pasakas.txt', $(this).text() + '\n');
            urls.push($(this).text());
        }
    });

    try {
        stats = fs.statSync('pasakas-mp3.txt');
        fs.unlink('pasakas-mp3.txt');
    } catch (e) {}

    for (var i = 0; i < urls.length; i++) {
        // if (i >= MAX_PAGES_TO_VISIT) {
        //     // if not, there is almost 4GB of content...
        //     console.log("Reached max limit of number of pages to visit.");
        //     break;
        // }
        var url = new URL(urls[i]);
        visitPage(url);
    }
});


function visitPage(url) {
    // Make the request
    console.log("Visiting page " + url);
    request({
        url: url,
        method: 'GET',
        proxy: proxyUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
        }
    }, function(error, response, body) {
        // Check status code (200 is HTTP OK)
        //console.log("Status code: " + response.statusCode);
        if (response.statusCode !== 200) {
            return;
        }
        // Parse the document body
        var $ = cheerio.load(body);

        var isWordFound = searchForWord($);
        if (isWordFound) {
            var title = $('audio').attr('src');
            console.log("Pasaka: " + title);
            fs.appendFileSync('pasakas-mp3.txt', title + '\n');

            //mp3.push(title);
            downloadMP3(title, url);
        }
    });
}

function searchForWord($) {
    var elements = $('audio');
    return (elements.length > 0);
}

function downloadMP3(mp3, url) {
    var newUrl = new URL(mp3);
    var parsed = mp3url.parse(mp3);
    var fileName = path.basename(parsed.pathname);
    var folders = (mp3url.parse(url.toString())).pathname;

    folders = folders.replace(/\/[a-zA-Z]\//g, '/');
    var dest = (path.join('/Temp/crawler/mp3/', folders)).slice(0,-1) + '.mp3';
    console.log(dest);

    try {
        stats = fs.statSync(path.dirname(dest));
    } catch (e) {
        var mkdirp = require('mkdirp');
        mkdirp.sync(path.dirname(dest), function(err) { 
            console.log(err);
            // path was created unless there was error
        });
    }

    try {
        stats = fs.statSync(dest);
        fs.unlink(dest);
    } catch (e) {}

    var options = {
        proxy: proxyUrl,
        method: 'GET',
        url: newUrl,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
        }
    };

    //console.log(dest);
    request
        .get(options)
        .on('error', function(err) {
            // handle error
            console.log(err.message);
        })
        .pipe(fs.createWriteStream(dest));
}