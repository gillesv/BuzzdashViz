function BuzzdashAPI() {
	this.campaignLoaded = function(data){};
}

BuzzdashAPI.prototype = {
	callbacks: {}
};

BuzzdashAPI.prototype.loadCampaign = function(campaignID, callback) {
	if(this.callbacks[campaignID] == null) {
		this.callbacks[campaignID] = [];
		this.callbacks[campaignID].push(callback);
	} else {
		this.callbacks[campaignID].push(callback);
		return;
	}
	

	var $ref = this;

	var blog_date_date = Array();
	var blog_total_mentions = Array();
	var blog_date_date = Array();
	var blog_total_tweets = Array();
	var blog_total_fblikes = Array();
	var blog_total_fbshares = Array()
	var blog_total_fbcomments = Array();
	var blog_total_fbclicks = Array(); 
	var blog_total_mentions = Array(); 
	var blog_total_share = Array();

	var video_date_date = Array();
	var video_total_tweets = Array(); 
	var video_total_fblikes = Array(); 
	var video_total_fbshares = Array(); 
	var video_total_fbcomments = Array(); 
	var video_total_fbclicks = Array(); 
	var video_total_mentions = Array(); 
	var video_total_ytviews = Array(); 
	var video_total_ytcomments = Array(); 
	var video_total_share	= Array();

	var sources = Array();
	sources["this"] = this;
	sources["blog_date_date"] = blog_date_date;
	sources["blog_total_mentions"] = blog_total_mentions;
	sources["blog_date_date"] = blog_date_date;
	sources["blog_total_tweets"] = blog_total_tweets;
	sources["blog_total_fblikes"] = blog_total_fblikes;
	sources["blog_total_fbshares"] = blog_total_fbshares;
	sources["blog_total_fbcomments"] = blog_total_fbcomments;
	sources["blog_total_fbclicks"] = blog_total_fbclicks;
	sources["blog_total_mentions"] = blog_total_mentions;
	sources["blog_total_share"] = blog_total_share;
	sources["video_date_date"] = video_date_date;
	sources["video_total_tweets"] = video_total_tweets;
	sources["video_total_fblikes"] = video_total_fblikes;
	sources["video_total_fbshares"] = video_total_fbshares;
	sources["video_total_fbcomments"] = video_total_fbcomments;
	sources["video_total_fbclicks"] = video_total_fbclicks;
	sources["video_total_mentions"] = video_total_mentions;
	sources["video_total_ytviews"] = video_total_ytviews;
	sources["video_total_ytcomments"] = video_total_ytcomments;
	sources["video_total_share"] = video_total_share;




	  $.ajax({
		type: "POST",
		dataType: "json",
		url: "http://buzzdash.duvalguillaume.com/api/getgraphdata?cache=" + Math.random(),
		data: { id: campaignID }
	  }).done(function ( data ) {

	  var maindata = Array();

	  jQuery.each(data.blogmentions.statsintime, function() {
		if( parseInt(this.mentions) - parseInt(blog_total_mentions[blog_total_mentions.length-1]) >= -10 || blog_total_mentions.length == 0 || 1 == 1){
		  blog_date_date.push(this.date_date);
		  blog_total_tweets.push(this.tweets);
		  blog_total_fblikes.push(this.fblikes);
		  blog_total_fbshares.push(this.fbshares);
		  blog_total_fbcomments.push(this.fbcomments);
		  blog_total_fbclicks.push(this.fbclicks);
		  blog_total_mentions.push(this.mentions);
		  blog_total_share.push(parseInt(this.tweets) + parseInt(this.fblikes) + parseInt(this.fbshares) + parseInt(this.fbcomments));

		} 
	  });

	  jQuery.each(data.videomentions.statsintime, function() {
		if(	 parseInt(this.mentions) - parseInt(video_total_mentions[video_total_mentions.length-1]) >= -10 || video_total_mentions.length == 0){
		video_date_date.push(this.date_date);
		video_total_tweets.push(this.tweets);
		video_total_fblikes.push(this.fblikes);
		video_total_fbshares.push(this.fbshares);
		video_total_fbcomments.push(this.fbcomments);
		video_total_fbclicks.push(this.fbclicks);
		video_total_mentions.push(this.mentions);
		video_total_ytviews.push(this.views);
		video_total_ytcomments.push(this.ytcomments);
		video_total_share.push(parseInt(this.tweets) + parseInt(this.fblikes) + parseInt(this.fbshares) + parseInt(this.fbcomments));

		}
	  });

	
	  date_date = union_arrays (video_date_date, blog_date_date);
	  date_date.sort();

  

  var datestouse
  datestouse = date_date

  var numDataLines = 0;
  
	var firstdatetouse = datestouse[0];
	var firstdatetousearr = firstdatetouse.split("-");
	var firstdate = new Date(parseInt(firstdatetousearr[0]), parseInt(firstdatetousearr[1])-1, parseInt(firstdatetousearr[2]));

	var lastdatetouse = datestouse[datestouse.length-1];
	var lastdatetousearr = lastdatetouse.split("-");
	var lastdate = new Date(parseInt(lastdatetousearr[0]), parseInt(lastdatetousearr[1])-1, parseInt(lastdatetousearr[2]));
  
  lastdate.setDate(lastdate.getDate()+1);

  var daycounter = 0;
  var currentdate = firstdate
  var max_mentions = 0;
  var previousShares = 0;
  var previousViews = 0;

  var dayswithoutdata = 1;

  var maxShares = 0;
  var maxViews = 0;

  while (currentdate.toString() != lastdate.toString())
  {
	
	
	var curr_date = currentdate.getDate();
	var curr_month = currentdate.getMonth() + 1; //Months are zero based
	var curr_year = currentdate.getFullYear();
	var curr_date_format = '' + curr_year +'-'+ (curr_month<=9?'0'+curr_month:curr_month) +'-'+ (curr_date<=9?'0'+curr_date:curr_date);
	var i = datestouse.indexOf(curr_date_format);
	

	if( i == -1 ){	
	
	  var datarow = Array();
	  datarow["date"] = (curr_date_format);
	  //datarow = addStatsForType(datarow, 'ytviews', null, sources);
	  //datarow = addStatsForType(datarow, 'ytcomments', null, sources);
	  //datarow = addStatsForType(datarow, 'tweets', null, sources);
	  //datarow = addStatsForType(datarow, 'fblikes', null, sources);
	  //datarow = addStatsForType(datarow, 'fbshares', null, sources);
	  //datarow = addStatsForType(datarow, 'fbcomments', null, sources);
	  //datarow = addStatsForType(datarow, 'shareratio', null, sources);
	  datarow["total_shares"] = null;
 		datarow["num_shares"] = null;	   
 		datarow["estimated"] = false;
 		datarow["total_views"] = null; 
 		datarow["num_views"] = null;
	  //datarow.push("test");
	  numDataLines = datarow.length;
	  maindata.push(datarow);
	  dayswithoutdata++;
	  
	} else {
	  
	  var datarow = Array();
	  datarow["date"] = (datestouse[i]);
	  //datarow = addStatsForType(datarow, 'ytviews', datestouse[i], sources);
	  //datarow = addStatsForType(datarow, 'ytcomments', datestouse[i], sources);
	  //datarow = addStatsForType(datarow, 'tweets', datestouse[i], sources);
	  //datarow = addStatsForType(datarow, 'fblikes', datestouse[i], sources);
	  //datarow = addStatsForType(datarow, 'fbshares', datestouse[i], sources);
	  //datarow = addStatsForType(datarow, 'fbcomments', datestouse[i], sources);
	  //datarow = addStatsForType(datarow, 'shareratio', datestouse[i], sources);
	  datarow["estimated"] = dayswithoutdata > 1 ? true : false;
	  datarow["total_shares"] = parseInt(video_total_share[i] + blog_total_share[i]); 
 		datarow["num_shares"] = parseInt(datarow["total_shares"] - previousShares) / dayswithoutdata;  

 		if(!isNaN(datarow["num_shares"]))
 		maxShares = Math.max(datarow["num_shares"], maxShares); 

 		datarow["total_views"] = parseInt(video_total_ytviews[i]); 
 		datarow["num_views"] = parseInt(datarow["total_views"] - previousViews) / dayswithoutdata;

 		if(!isNaN(datarow["num_views"]))
 		maxViews = Math.max(datarow["num_views"], maxViews); 

	  previousShares = datarow["total_shares"];
	  previousViews = datarow["total_views"];
	  //datarow.push("test");
	  numDataLines = datarow.length;
	  maindata.push(datarow);
	  dayswithoutdata = 1;
	}
	
	currentdate = firstdate;
	currentdate.setDate(firstdate.getDate()+1);
  }

  	var returnData = Array();
  	
  	returnData["total_shares"] = data.totalstats.totalfb + data.totalstats.totaltweets;
  	returnData["total_views"] = data.totalstats.totalviews;
  	returnData["max_shares"] = maxShares;
  	returnData["max_views"] = maxViews;
	returnData["startdate"] = data.startdate;
	returnData["client"] = data.client;
	returnData["campaign"] = data.campaign;
	
	returnData["timeline"] = maindata;
  	  	
  	
  	
  	for (var i = 0; i < $ref.callbacks[campaignID].length; i++) {
	  	var cb = $ref.callbacks[campaignID][i];
	  	
	  	cb.call(null, returnData);
  	}

  });

	  function union_arrays (x, y) {
		var obj = {};
		for (var i = x.length-1; i >= 0; -- i)
		   obj[x[i]] = x[i];
		for (var i = y.length-1; i >= 0; -- i)
		   obj[y[i]] = y[i];
		var res = []
		for (var k in obj) {
		  if (obj.hasOwnProperty(k))  // <-- optional
			res.push(obj[k]);
		}
		return res;
	  }


  function addStatsForType(data, type, date, sources){
	
	if($('#stats_'+type).attr('checked')|| 1 == 1){
	  
	  var index_video = video_date_date.indexOf(date);
	  var index_blog = blog_date_date.indexOf(date);
	  
	  
	  var ontbrekendeblogdagen = days_between(String(blog_date_date[index_blog]), String(blog_date_date[index_blog-1]));
	  var ontbrekendevideodagen = days_between(String(video_date_date[index_video]), String(video_date_date[index_video-1]));
	
	  if(type == "shareratio"){
		if(index_video == -1 || index_blog == -1){
		  data["shareratio"] = null;
		} else {
		
		  var totalvideo = parseInt(sources["video_total_share"][index_video]);
		  var totalblog = parseInt(sources["blog_total_share"][index_blog]);
		  var totalview = parseInt(sources["video_total_ytviews"][index_video]);
		  
		  data["shareratio"] =(totalview / (totalvideo + totalblog));
		  
		  
		}
		return data;
	  }
	  

	  if($("#show").val() == "video" || 1 == 1){
		if(index_video == -1){
		  data["video_" + type] = (null)
		} else {
		  data["video_" + type] = (parseInt(giveNumberOfTheDay(sources["video_total_" + type][index_video], sources["video_total_" + type][index_video-1], ontbrekendevideodagen)));
		}
	  }
	  if($("#show").val() == "blog" || 1 == 1){
		if(index_blog == -1){
		  data["blog_"] = (null)
		} else {
		  if(sources["blog_total_" + type]){
		  
			data["blog_" + type] = (parseInt(giveNumberOfTheDay(sources["blog_total_" + type][index_blog], sources["blog_total_" + type][index_blog-1], ontbrekendeblogdagen)));
		  } else {
			data["blog_" + type] = (null);
		  }
		}
	  }
	}
	
	return returnData;
  }

  function days_between(date1_string, date2_string) {

	  // The number of milliseconds in one day
	  var ONE_DAY = 1000 * 60 * 60 * 24

	  // Convert both dates to milliseconds
	var date1_arr = date1_string.split("-");
	var date1 = new Date(parseInt(date1_arr[0]), parseInt(date1_arr[1])-1, parseInt(date1_arr[2]));
	var date2_arr = date2_string.split("-");
	var date2 = new Date(parseInt(date2_arr[0]), parseInt(date2_arr[1])-1, parseInt(date2_arr[2]));
	  
	  
	  var date1_ms = date1.getTime()
	  var date2_ms = date2.getTime()

	  // Calculate the difference in milliseconds
	  var difference_ms = Math.abs(date1_ms - date2_ms)
	  
	  // Convert back to days and return
	
	  return Math.round(difference_ms/ONE_DAY)

  }

  function giveNumberOfTheDay(today, yesterday, aantaldagendieontbreken){

	if($("#interval").val() == "daily"){
	  if(yesterday == undefined){
		return today
	  }
	  
	  if(today - yesterday < 0){
		
		return null
	  } 
	  
	  if(aantaldagendieontbreken > 0){
		return (today - yesterday) / (aantaldagendieontbreken);
	  } else {
		return today - yesterday;
	  }
	  
	} else {
	  return today;
	}
  }


};
		


