var http = require('http');
var url = require('url');
var crypto = require('crypto');
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();
var lectioHelper = require('./lectio-helper');
var httpTools = require('./http-tools');

var server = http.createServer(function (req, res) {
	res.writeHead(200, { 'content-type': 'text/json; charset=utf-8' });
	this.startTime = new Date().getTime();
	this.sequence++;
	if(url.parse(req.url).query != null){
		qs = httpTools.splitQuery(url.parse(req.url).query);
		if(String(typeof(qs.elev)) != "undefined"){
			var type = "0";
			var person = qs.elev;
		}else if(String(typeof(qs.laerer)) != "undefined"){
			var type = "1";
			var person = qs.laerer;
		}
		var school = qs.skole;
		if(String(typeof(qs.uger)) == "undefined"){
			var amount = 2;
		}else{
			var amount = Number(qs.uger);
		}
		if(Number(person) && Number(school)){
			lec = new lectio(res,amount,type,school,person);
			lec.generate(res);
		}else{
			res.end();
		}
	}
	else res.end();
});

function lectio(res,amount,type,school,person){
	this.res = res;
	this.school = school;
	this.person = person;
	this.amount = amount;
	this.type = type;
	var now = new Date();
	this.nowTime = lectioHelper.dateFormat(now);
	if(Math.floor(now.getMinutes()/15)==0){
			var min = "00";
	}else{
			var min = Math.floor(now.getMinutes()/15)*15;
	}
	now.setUTCMinutes(min);
	now.setUTCSeconds(00);
	this.lastTime = lectioHelper.dateFormat(now);
	
	this.beginOutput = function(){
		begin = "BEGIN:VCALENDAR\r\n";
		begin += "VERSION:2.0\r\n";
		begin += "PRODID:-//EMILBA.CH//LECTIO//DA\r\n";
		begin += "CALSCALE:GREGORIAN\r\n";
		begin += "METHOD:PUBLISH\r\n";
		begin += "X-PUBLISHED-TTL:PT15M\r\n";
		begin += "X-WR-CALNAME:Lectio skema\r\n";
		begin += "X-WR-TIMEZONE:Europe/Copenhagen\r\n";
		return begin;
	}
	this.endOutput = function(){
		return "END:VCALENDAR\r\n";
	}

	this.finishedProcessing = function(add){
		var load = Number(new Date().getTime()) - Number(server.startTime);
		//console.log(load + "ms");
		//console.log(this.amount + ": " + this.type + " - " + this.school + " - " + this.person);
		server.storage.write("sequence", server.sequence,null);
		this.res.end(this.endOutput());
		server.loadTimes += load;
		server.amnt++;
	}

	this.processEvent = function(titleString,callback,index){

		var lines = titleString.split("\n");
		if(lines[0].substr(0,1) == "A"){
			lines.splice(0,1);
			var cancelled = true;
		}else if(lines[0].substr(0,1) == "&"){
			lines.splice(0,1);
			var changed = true;
		}		

	
		/* TIME */
		var time = lines[0].split(" "); //As the date is always on line 0
		time[0] = time[0].replace(/\//g,"-").split("-");
		if(time[0][1].length == 1) time[0][1] = "0" + time[0][1];
		if(time[0][0].length == 1) time[0][0] = "0" + time[0][0];
		time[0] = time[0].reverse().join("-");
		var start = new Date(time[0] + " " + time[1]);
		if(time.length == 4) var end = new Date(time[0] + " " + time[3]);
		else{
			time[3] = time[3].replace(/\//g,"-").split("-");
			if(time[3][1].length == 1) time[3][1] = "0" + time[3][1];
			if(time[3][0].length == 1) time[3][0] = "0" + time[3][0];
			time[3] = time[3].reverse().join("-");
			var end = new Date(time[3] + " " + time[4]);
		}
		lines.splice(0,1);
			

		while(lines[0]!=undefined && lines[0]!=""){
				
			/* TEACHER */
			if(lines[0].substr(0,11) == "L&#230;rer:"){
				var line = lines[0].split(": ");
				var regExp = /\(([^)]+)\)/;
				var teacher = regExp.exec(line[1])[1];
			}
			else if(lines[0].substr(0,11) == "L&#230;rere"){
				var line = lines[0].split(": ");
				var teacher = line[1].split(",").join("");
			}

				
			/* SUBJECT */
			else if(lines[0].substr(0,5) == "Hold:"){
				var line = lines[0].split(": ");
				var subject = line[1];
			}


			/* LOCATION */
			else if(lines[0].substr(0,7) == "Lokale:"){
				var line = lines[0].split(": ");
				var location = line[1];
				if(location.charCodeAt(location.length-1)=="13") location = location.substr(0,location.length-1);
			}
			else if(lines[0].substr(0,8) == "Lokaler:"){
				var line = lines[0].split(": ");
				var location = line[1].split(",").join("");
				if(location.charCodeAt(location.length-1)=="13") location = location.substr(0,location.length-1);
			}


			/* SPECIAL EVENT */
			else{
				var special = lines[0];
				if(String(typeof(special)) != "undefined"){
					if(special.charCodeAt(special.length-1)=="13") special = special.substr(0,special.length-1);
				}
			}
			lines.splice(0,1);
				
		}
			
		while(lines.length>0 && (lines[0]=="" || lines[0].substr(0,6)=="Links:")){
			lines.splice(0,1);
		}

		var hw = '';
		var no = '';
		var descm = 0;
			
		if(lines.length>0 && lines[0]!=undefined){
				
			if(lines[0].substr(0,8) == "Lektier:"){
				lines.splice(0,1);
				while(lines[0]!=undefined && lines[0]!="Note:"){
					hw += lines[0] + "\n";
					lines.splice(0,1);
				}
				descm = descm+2;
			}

			if(lines.length>0 && lines[0].substr(0,5) == "Note:"){
				lines.splice(0,1);
				while(lines[0]!=undefined){
					no += lines[0] + "\n";
					lines.splice(0,1);
				}
				descm++;
			}

		}
		hw = lectioHelper.removePadding(hw);
		no = lectioHelper.removePadding(no);
		if(hw != "" && no != ""){
			var desc = no + "\n\n\n\n" + hw;
		}else if(no != ""){
			var desc = no;
		}else if(hw != ""){
			var desc = hw;
		}

		if(String(typeof(special)) == "undefined") var special = "";
		else special += " - ";
		if(String(typeof(teacher)) == "undefined") var teacher = "";
		else teacher += " - ";
		if(descm == 1) add = "N - ";
		else if (descm == 2) add = "L - ";
		else if (descm == 3) add = " - L:N - ";
		else add = ''; 
		if(String(typeof(subject)) != "undefined"){
			if(subject.charCodeAt(subject.length-1)=="13") subject = subject.substr(0,subject.length-1);
			subject = subject + " - ";
		}else{
			var subject = "";
		}
		
		var summary = special + subject + teacher + add;
		summary = summary.substr(0,summary.length-3);
		if(summary=="" && String(typeof(subject)) != "") summary += subject;
		 + " - " + teacher + add;

		o = "BEGIN:VEVENT" + "\r\n";
		o += "UID:" + crypto.createHash('md5').update(teacher + start + end).digest('hex') + "@emilba.ch" + "\r\n";
		o += "SEQUENCE:" + server.sequence + "\r\n"; //This is important, to push updates
		if(cancelled===true) o += "STATUS:CANCELLED" + "\r\n";
		o += "DTSTAMP:" + this.nowTime + "\r\n";
		o += "LAST-MODIFIED:" + this.lastTime + "\r\n";
		o += "DTSTART:" + lectioHelper.dateFormat(start) + "\r\n";
		o += "DTEND:" + lectioHelper.dateFormat(end) + "\r\n";
		o += "SUMMARY:" + entities.decode(summary) + "\r\n";
		if(String(typeof(location)) != "undefined") o += "LOCATION:" + location + "\r\n";
		if(descm>0) o += "DESCRIPTION:" + entities.decode(desc).replace(/\n/g,"\\n").replace(/\,/g,"\\,").replace(/\;/,"\\;") + "\r\n";
		o += "END:VEVENT" + "\r\n";
		callback(o);
	}

	this.generate = function(){
		this.res.write(this.beginOutput());
		if(this.type == "0"){
			var base = "http://www.lectio.dk/lectio/" + this.school + "/SkemaNy.aspx?type=elev&elevid=" + this.person + "&week=";
		}else{
			var base = "http://www.lectio.dk/lectio/" + this.school + "/SkemaNy.aspx?type=laerer&laererid=" + this.person + "&week=";
		}
		var da = new Date();
		var d = da.getTime();
		var y = da.getUTCFullYear();
		var w = lectioHelper.getWeekNumber(d);
		var l = this;
		var promises = [];
		for(x=0;x<this.amount;x++){
			var week = lectioHelper.getWeekNumber(d+x*604800000);
			week = lectioHelper.pad(week);
			if(week >= w) var result = week + String(y);
			else var result = week + String(y+1);
			var promise = new Promise(function(resolve,reject){
       			http.get(base + result,function (resp){
           			if(resp.statusCode=="200"){
						var body;
       					resp.setEncoding("utf8");
        				resp.on("data", function(data){
        				    body += data;
        				});
        				resp.on("error", console.error);
       					resp.on("end", function(){
       						resolve(body);
       					});
       				}else{
       					if(l.loaded == 0){
       						console.log("Error " + resp.statusCode);
       					}					
       				}
            	});
        	});
        	promise.then(function(body){
       			var cheerio = require("cheerio");
        		$ = cheerio.load(body);
        		l.els = l.els + $(".s2bgbox")["length"];
       			$(".s2bgbox").each(function(i,item){
       				var promise = new Promise(function(resolve,reject){
     					l.processEvent(item.attribs.title,function(output){
        					resolve(output);
        				},x);
        			});
        			promise.then(function(output){
        				l.res.write(output);
        			});
        		});
        	});
        	promises.push(promise);			
		}
		Promise.all(promises).then(function(){
			l.finishedProcessing();
		});
	}
}

server.storage = require("./storage");
server.sequence = Number(server.storage.read("sequence"));
server.amnt = 0;
server.loadTimes = 0;
server.listen(9002);
server.last = 0;

function runAnalytics(){
	var sequence = server.sequence;
	var date = new Date();
	console.log(date);
	console.log("Fetched " + server.amnt + " time(s) since last analytics run. Total: " + sequence);
	var pt = server.amnt/((date.getTime() - server.last)/1000/600);
	console.log("Fetches per 10m: " + pt);
	console.log("Average load time: " + server.loadTimes/server.amnt + "ms\n");
	server.last = date.getTime();
	server.amnt = 0;
	server.loadTimes = 0;
}
function cron(interval){
	runAnalytics();
	setTimeout(cron, interval*1000);
}
cron(3600);
