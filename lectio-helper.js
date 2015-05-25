var exports = module.exports = {};
exports.getWeekNumber = function(time){
    var d = new Date(time + 8.64e7 * 2);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};

exports.pad = function(arg){
    if(String(arg).length==1) arg = "0" + arg; return arg;
};

exports.dateFormat = function(date){
    return date.getUTCFullYear() +""+ this.pad(date.getUTCMonth() + 1) +""+ this.pad(date.getUTCDate()) + "T" + this.pad(date.getUTCHours()) +""+ this.pad(date.getUTCMinutes()) +""+ this.pad(date.getUTCSeconds()) + "Z";
};

exports.removePadding = function(str){
	arr = str.split("\n");
	arr.reverse();
	while(arr[0]!=undefined && arr[0]==""){
		arr.splice(0,1);
	}
	arr.reverse();
	str = arr.join("\n");
	return str;
};