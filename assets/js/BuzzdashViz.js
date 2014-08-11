var Buzzdash = {
	api: null,
	visualisations: []
};


/*
 *	Buzzdash Visualisation
 */
 
function BuzzdashViz(el, options) {
	this.setup(el, options);
	
	Buzzdash.visualisations.push(this);	// add to collection
		
	return this;
}

BuzzdashViz.prototype = {
	DEBUG: false,		// toggles logs
	
	api: null,			// reference to the BuzzdashAPI
	
	$el: null,			// reference to container element (jquery)
	
	options: null,		// options	
	
	svg: null,			// <svg> for rendering
	context: null,		// 2D Drawing context
	
	needsRender: false,	// view invalidation: set to true to re-draw
	
	data: null,			// JSON gotten from the BuzzdashAPI
	stage: null,		// stage for rendering	(logical nested objects)
	
	setup: function (el, options) {		// setup/constructor method
		var $ref = this;
		
		$ref.$el = $(el);
		
		this.stage = new BuzzdashStage();
		
		if(Buzzdash.api == null) {
			Buzzdash.api = new BuzzdashAPI();
		}
		
		this.api = Buzzdash.api;
		
		// default options
		this.options = {
			campaignID: null,		// ID of the campaign-results to chart: get this value from inside Buzzdash
			animated: true,			// is the chart animated?
			animationDuration: 200,	// duration in frames
			resizable: true,		// is this static or liquid?
			startDate: null,		// optional: datestring for the start of the to be visualised metrics
			endDate: null,			// optional: datestring for the end of the to be visualised metrics (with one or both of these, you can show only a portion of the metrics)
			type: "bars",			// what kind of chart, is it a bar chart or a line-graph? (options: "bars", "line")
			filter: "both"			// which datapoints do we visualize, shares, views or both? (options "both", "shares", "views")
		};
		
		// adding JSON options
		if(options != null) {
			$.extend($ref.options, options);
		} 
		
		// adding data-options
		var dataOptions = {};
					
		if($ref.$el.data("animation-duration") !== undefined) {
			dataOptions.animationDuration = $ref.$el.data("animation-duration");
		} 
		
		if($ref.$el.data("campaign-id") !== undefined) {
			dataOptions.campaignID = $ref.$el.data("campaign-id");
		} 
		
		if($ref.$el.data("animated") !== undefined) {
			dataOptions.animated = $ref.$el.data("animated");
		}
		
		if($ref.$el.data("resizable") !== undefined) {
			dataOptions.resizable = $ref.$el.data("resizable");
		}
					
		if($ref.$el.data("start-date") !== undefined) {
			dataOptions.startDate = $ref.$el.data("start-date");
		}
		
		if($ref.$el.data("end-date") !== undefined) {
			dataOptions.endDate = $ref.$el.data("end-date");
		}
		
		if($ref.$el.data("type") !== undefined) {
			dataOptions.type = $ref.$el.data("type");
		}
		
		if($ref.$el.data("filter") !== undefined) {
			dataOptions.filter = $ref.$el.data("filter");
		}
		
		$.extend($ref.options, dataOptions);
		
		
		if(this.options.campaignID == null || this.options.campaignID == undefined) {
			alert("Error: can't graph results, no campaign ID was provided");
			
			return;
		}
		
		// resizing		
		$(window).resize(function(evt){
			if($ref.options.resizable) {
				$ref.resize();
			}
		});
		this.measure();
		
		this.createMarkup(this.$el);
		
		// get data
		$ref.api.loadCampaign(this.options.campaignID, function(data){
			$ref.campaignLoaded(data);
			
			// set textfield values
			var $numviews = $("#dg-buzzchart-numviews"),
				$numshares = $("#dg-buzzchart-numshares");
			
			if($numviews.length > 0){
				var views_string = data['total_views'].toString(),
					shares_string = data['total_shares'].toString();
			
				// add comma's
				function addCommas(string) {
					var combine = "";
					
					for(var i = string.length -1; i > 0; i--) {
						if(i%3 == 0 && i!== string.length - 1) {
							combine += ',';
						}
						
						combine += string.charAt(i).toString();
					}
					
					return combine;
				}
				
				$numviews.text(addCommas(views_string));
				$numshares.text(addCommas(shares_string));
				
				$numviews.attr("id", null);
				$numshares.attr("id", null);
			}
		});
		
		(function animLoop() {
			requestAnimationFrame(animLoop);
				
			if($ref.needsRender) {
				$ref.render();
			}
		})();
		
		return this;
	},
	
	timeout: null,
	
	play: function (delay) {
		var $ref = this;
	
		if(delay == undefined) {
			delay = 0;
		}
		
		clearTimeout(this.timeout);
		
		$($ref.svg).hide();
		
		this.timeout = setTimeout(function(){
			$($ref.svg).show();
			$ref.resize();
		}, delay);
	},
	
	resize: function () {	
		this.measure();
				
		if(this.stage.prevwidth !== this.stage.width || this.stage.prevheight !== this.stage.height) {
			$(this.svg).attr("width",  this.stage.width);
			$(this.svg).attr("height", this.stage.height);
			
			$(this.svg).empty();
		}
		
		this.stage.playhead = 0;					
		this.needsRender = true;
	},
	
	measure: function () {
		if(this.$el) {
			this.stage.prevwidth = this.stage.width;
			this.stage.prevheight = this.stage.height;
			
			this.stage.width = this.$el.width();
			this.stage.height = this.$el.height();
			
			if(this.stage.width != this.stage.prevwidth || this.stage.height != this.stage.prevheight) {
				// store previous query
				this.stage.prevmedia = this.stage.selectedmedia;
								
				// check which media query is active
				for(var id in this.stage.media) {
					var mq = this.stage.media[id];
										
					if (this.stage.width > mq.minwidth) {
						this.stage.selectedmedia = id;
					}
				}
				
				// empty arrays -> this causes a re-calculation of the data-models
				this.stage.views = [];
				this.stage.shares = [];
			}
			
		}
	},

	render: function() {
		// local vars
		var $ref = this,
			stage = $ref.stage,
			data = $ref.data,
			options = $ref.options,
			ctx = $ref.context,
			views = $ref.stage.views,
			shares = $ref.stage.shares,
			mq = $ref.stage.media[stage.selectedmedia],
			
			numbars,
			barwidth,
			bargap,
			scale;
			
		
		numbars = mq.numbars;
		barwidth = mq.barwidth;
		bargap = mq.bargap;
				
		
		// normalisation of data & margins calculations
		if(views.length == 0 && mq != null){
			$ref.normalizeData();
		}
		
		scale = $ref.stage.scale;
		
		// draw bargraphs	
		switch(options.type) {	
			case "line":
				$ref.renderLineChart(views, shares);
			break;
			case "bars":
			default: 
				$ref.renderBarChart(views, shares, numbars, scale, barwidth, bargap);
			break;
		}
		// advance playhead
		$ref.advancePlayhead(options, stage);
	},
	
	renderLineChart: function(views, shares) {
		var $ref = this,
			stage = this.stage,
			options = this.options,
			items = [],
			color,
			item_width = stage.width/views.length,
			max,
			scale;
			
		switch(options.filter) {
			default:
			case "views":
				items = views;
				color = stage.views_color;
				max = stage.total_views;
			break;
			case "shares":
				items = shares;
				color = stage.shares_color;
				max = stage.total_shares + stage.total_views;
			break;
		}
		
		var additiveCount = 0;
		scale = (stage.height / max);
				
		for(var i = 0; i < items.length; i++) {
			var item = items[i],
				svg_line;
				
			if(item == undefined) {
				break;
			}
			
			if(item.svg_el == null) {
				svg_line = $(document.createElementNS("http://www.w3.org/2000/svg", "line"));
				
				svg_line.attr({ stroke: color, "stroke-width": 2 });
				
				item.svg_el = svg_line;
				
				$($ref.svg).append(svg_line);
			}
			
			if(item.svg_el != null) {
				svg_line = item.svg_el;
				
				var x1 = i*item_width,
					y1 = additiveCount*scale,
					x2 = (i+1)*item_width,
					y2 = (additiveCount + item.count)*scale;
				
				additiveCount += item.count;
				
				svg_line.attr({
					"x1" : x1,
					"y1" : stage.height - y1,
					"x2" : x2,
					"y2" : stage.height - y2
				});
			}
		}
	},
	
	// render the bar-chart
	renderBarChart: function(views, shares, numbars, scale, barwidth, bargap) {
		var $ref = this,
			stage = this.stage,
			options = this.options;
			
		for(var i = 0; i < views.length; i++) {
			
			var view = views[i],
				share = shares[i],
				svg_view,
				svg_share;
			
			if(view == undefined) {
				break;
			}
			
			if(options.animated) {
				view.anim = share.anim = Math.min(Math.ceil(options.animationDuration/numbars), Math.max(0, stage.playhead - i)); 
			} else {
				view.anim = share.anim = Math.max(1, Math.ceil(options.animationDuration/numbars));
			}
			
			if(view.svg_el == null) {
				// create svg elements
				svg_view = $(document.createElementNS("http://www.w3.org/2000/svg", "rect"));  
				svg_share = $(document.createElementNS("http://www.w3.org/2000/svg", "rect"));
				
				svg_view.attr({ fill: stage.views_color });
				svg_share.attr({ fill: stage.shares_color });
				
				view.svg_el = svg_view;
				share.svg_el = svg_share;
				
				$($ref.svg).append(svg_view);
				$($ref.svg).append(svg_share);
			}
			
			if(view.svg_el !== null) {
				svg_view = view.svg_el,
				svg_share = share.svg_el;
								
				var anim_progress_view = view.anim / Math.ceil(options.animationDuration/numbars),
					anim_progress_share = share.anim / Math.ceil(options.animationDuration/numbars),
					view_height = Math.max(1, view.count*scale) * anim_progress_view,
					share_height = Math.max(1, share.count*scale) * anim_progress_share,
					xoffset = i * (barwidth + bargap) + stage.marginw,
					yoffset_views = Math.round((stage.max_views - view.count*anim_progress_view)*scale) + stage.marginh,
					yoffset_shares = Math.round(stage.max_views*scale) + bargap + stage.marginh;
				
				svg_view.attr({
								"x" : xoffset,
								"y" : yoffset_views,
								"width" : barwidth,
								"height" : view_height
							  });
							  
				svg_share.attr({
								"x" : xoffset,
								"y" : yoffset_shares,
								"width" : barwidth,
								"height" : share_height
							  });			
			}
		}
	},
	
	advancePlayhead: function(options, stage) {
		if(options.animated) {
			stage.playhead ++;
			
			if(stage.playhead == options.animationDuration) {
				this.needsRender = false;
			}else {
				this.needsRender = true;
			}
		} else {
			this.needsRender = false;
		}
	},
	
	// generate optimized data & calculate margins & returns scale
	normalizeData: function() {
		// local vars
		var $ref = this,
			stage = this.stage,
			data = this.data,
			options = this.options,
			views = this.stage.views,
			shares = this.stage.shares,
			mq = this.stage.media[stage.selectedmedia],
			numbars,
			barwidth, 
			bargap,
			max_views = 0,
			max_shares = 0,
			total_views = 0,
			total_shares = 0,
			scale;
			
		numbars = mq.numbars;
		barwidth = mq.barwidth;
		bargap = mq.bargap;
			
		if(views.length == 0 && mq != null) {
			var timeline,
				data_per_bar,
				counter = 0;
			
			if(options.type == "line") {
				data_per_bar = 1;
			} else {
				data_per_bar = Math.round(data.timeline.length / numbars);
			}
			
			
			if(data_per_bar == 0) {
				data_per_bar = 1;
			}
			
			// combine 
			for(var i = 0; i < data.timeline.length; i++) {
				timeline = data.timeline[i];
				
				if(counter%data_per_bar == 0) {
					views.push({
						count: !isNaN(timeline.num_views)? Math.max(timeline.num_views, 0) : 0,
						anim: 0,
						svg_el: null,
						date: timeline.date
					});
					shares.push({
						count: !isNaN(timeline.num_shares)? Math.max(timeline.num_shares, 0) : 0,
						anim: 0,
						svg_el: null,
						date: timeline.date
					});
				} else {
					views[views.length - 1].count += !isNaN(timeline.num_views)? Math.max(timeline.num_views, 0) : 0;
					shares[shares.length - 1].count += !isNaN(timeline.num_shares)? Math.max(timeline.num_shares, 0) : 0; 
				}
				
				if(views[views.length - 1].count > max_views) {
					max_views = views[views.length - 1].count;
				}
				
				if(shares[shares.length - 1].count > max_shares) {
					max_shares = shares[shares.length - 1].count;
				}
				
				
				total_views += !isNaN(timeline.num_views)? Math.max(timeline.num_views, 0) : 0;
				total_shares += !isNaN(timeline.num_shares)? Math.max(timeline.num_shares, 0) : 0;
				
				counter ++;
			}
			
			scale = ((stage.height) / (max_views + max_shares));
			stage.max_views = max_views;
			stage.max_shares = max_shares;
			
			stage.total_views = total_views;
			stage.total_shares = total_shares;
			
			// margins
			stage.marginw = (stage.width - (views.length * (barwidth + bargap)))/2;
			stage.marginh = (stage.height - ((max_views + max_shares)*scale + bargap));
		}
		
		if(this.DEBUG) {
			console.log("Data");
			console.log(this.stage.views);
			console.log(this.stage.shares);
			
			console.log("Max views&shares:");
			console.log(max_views + " " + max_shares);
			console.log("versus:");
			console.log(data.max_views + " " + data.max_shares);
		}
		
		stage.scale = scale;
	},
	
	createMarkup: function($el) {
		$el.empty();
		
		this.svg = $(document.createElementNS("http://www.w3.org/2000/svg", "svg"), {Width: this.stage.width, Height: this.stage.height, xmlns:"http://www.w3.org/2000/svg", version: '1.1'})[0];
		
		this.svg.setAttribute("id", Math.round(Math.random()*100).toString());
		
		$el.append(this.svg);			
	},
	
	campaignLoaded: function (data) {	// JSON is loaded from API
		this.data = data;
		
		if(this.DEBUG) {
			console.log("campaignLoaded");
			console.log(data);
			console.log(this);
		}
		
		if(this.options.startDate !== null || this.options.endDate !== null) {
			var timeline = this.data.timeline.concat(), // make a copy of the timeline
				filtered_timeline = [],
				item,
				startDate = this.options.startDate, 
				endDate = this.options.endDate,
				i = 0;	
			
			
			if(startDate !== null && endDate !== null) {
				if(this.DEBUG) {
					console.log("Filtering. Start date: " + startDate + " / End date: " + endDate);
				}
			
				for(i = 0; i < timeline.length; i++) {
					item = timeline[i];
					
					if( this.compareDateStrings(item.date, startDate) == startDate && 
						this.compareDateStrings(item.date, endDate) == item.date) {
						filtered_timeline.push(item);	
					}
				}
			} else if(startDate !== null) {
				if(this.DEBUG) {
					console.log("Filtering. Start date: " + startDate);
				}
			
				for(i = 0; i < timeline.length; i++) {
					item = timeline[i];
					
					if( this.compareDateStrings(item.date, startDate) == startDate) {
						filtered_timeline.push(item);	
					}
				}
			} else if(endDate !== null) {
				if(this.DEBUG) {
					console.log("Filtering. End date: " + endDate);
				}
			
				for(i = 0; i < timeline.length; i++) {
					item = timeline[i];
					
					if( this.compareDateStrings(item.date, endDate) == item.date) {
						filtered_timeline.push(item);	
					}
				}
			}
			
			this.data.timeline = filtered_timeline;
			
			if(this.DEBUG) {
				console.log("campaign data filtered");
				console.log(this.data.timeline);
			}
		}
		
				
		this.needsRender = true;
	},
	
	compareDateStrings: function (date1, date2) {
		var date = date1,
			components1 = date1.split('-'),
			components2 = date2.split('-');
		
		if(components1.length !== components2.length) {
			return null;
		}
		
		for(var i = 0; i < components1.length; i++) {
			if(parseInt(components1[i].toString()) >  parseInt(components2[i].toString())){
				date = date2;
				break;
			}
		}		
		
		// return the earlier date
		return date;
	},
	
	random: function(min, max) {	// random number helper method
		if(min > max) {
			var sanity = min;
			min = max;
			max = sanity;
		}
		
		return min + Math.random()*(max - min);
	},
	
	lerp: function(start, end, delta) {	// linear interpolation helper method
		var diff = (end - start);
		
		return (start + diff*delta);
	}
};


// Request Animation Frame Polyfill (source: http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/)
(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

/** BuzzdashStage **/
// keeps track of everything being drawn. Encapsulated inside of BuzzdashViz — Don't use by itself!
function BuzzdashStage() {}

BuzzdashStage.prototype = {
	views: [],		// views-bars model
	shares: [],		// shares-bars model
	
	max_views: 0,	// based on normalized data, not actual data
	max_shares: 0,
	
	total_views: 0,	// based on actual data
	total_shares: 0,
	
	playhead: 0,	// for keeping track of the animation state
	
	scale: 1,
	
	width: 0,
	height: 0,
	prevwidth: -1,
	prevheight: -1,
	
	marginw: 0,		// margins to center the chart on stage
	marginh: 0,
	
	media: {	// "media queries" : different constants for different sizes
		'small' :  {
			minwidth: 0,
			numbars: 10,
			barwidth: 8,
			bargap: 2
		},
		'small2' :  {
			minwidth: 200,
			numbars: 20,
			barwidth: 8,
			bargap: 2
		},
		'small3' :  {
			minwidth: 250,
			numbars: 25,
			barwidth: 8,
			bargap: 2
		},
		'medium' : {
			minwidth: 319,
			numbars: 20,
			barwidth: 12,
			bargap: 4
		},
		'medium2' : {
			minwidth: 480,
			numbars: 24,
			barwidth: 15,
			bargap: 5
		},
		'medium3' : {
			minwidth: 600,
			numbars: 24,
			barwidth: 20,
			bargap: 5
		},
		'large' : {
			minwidth: 700,
			numbars: 24,
			barwidth: 24,
			bargap: 5
		},
		'large2' : {
			minwidth: 900,
			numbars: 30,
			barwidth: 25,
			bargap: 5
		},
		'large3' : {
			minwidth: 960,
			numbars: 32,
			barwidth: 25,
			bargap: 5
		},
		'huge' : {
			minwidth: 1019,
			numbars: 32,
			barwidth: 25,
			bargap: 6
		}
	},
	selectedmedia: 'small',	// active "media query"	id
	prevmedia: null,		// previously active "media query" id
	
	views_color: '#ff5d3b',
	shares_color: '#ffffff'
};