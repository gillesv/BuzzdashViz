/*
 *	Buzzdash Visualisation
 *
 *	v1.0 - given basic parameters, draw a responsive and animated chart with data from Buzzdash
 *	
 *	Feature roadmap:
 *
 *	- v1.1 - retina testing
 *  - v1.1.1 - added SVG mode
 *  - v1.1.2 - added ability to crop time-slice... ladies.
 *	- v1.2 - additional media-queries & sizes
 *	- v2.0 - interactivity: hover on bars to see actual numbers
 */

function BuzzdashViz($el, options) {
	this.$el = $el;
	
	this.setup(options);
}

BuzzdashViz.prototype = {
	
	DEBUG: true,		// toggles logs
	
	api: null,			// reference to the BuzzdashAPI
	
	$el: null,			// reference to container element (jquery)
	options: {			// options read from the data-* properties
		campaignID: null,		// ID of the campaign-results to chart: get this value from inside Buzzdash
		animated: true,			// is the chart animated?
		animationDuration: 60,	// duration in frames
		pixelRatio: 1,			// for dealing with retina, hi-dpi, etc...
		resizable: true,		// is this static or liquid?
		cansave: true,			// can you right click>save on the visual? (toggles between attaching canvas & img)
		svg: false,				// toggle between using SVG or canvas to render the chart
		startDate: null,		// optional: datestring for the start of the to be visualised metrics
		endDate: null			// optional: datestring for the end of the to be visualised metrics (with one or both of these, you can show only a portion of the metrics)
	},		
	
	$img: null, 		// container for the canvas data-url
	canvas: null, 		// <canvas> for rendering
	svg: null,			// <svg> for rendering
	context: null,		// 2D Drawing context
	
	needsRender: false,	// view invalidation: set to true to re-draw
	
	data: null,			// JSON gotten from the BuzzdashAPI
	stage: {			// stage for rendering	(logical nested objects)
		
		views: [],		// views-bars model
		shares: [],		// shares-bars model
		
		max_views: 0,	// based on normalized data, not actual data
		max_shares: 0,
		
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
			'medium' : {
				minwidth: 200,
				numbars: 20,
				barwidth: 8,
				bargap: 2
			},
			'large' : {
				minwidth: 400,
				numbars: 20,
				barwidth: 16,
				bargap: 4
			},
			'hueg' : {
				minwidth: 800,
				numbars: 32,
				barwidth: 20,
				bargap: 5
			},
			'potat0wned' : {
				minwidth: 1200,
				numbars: 42,
				barwidth: 20,
				bargap: 5
			}
		},
		selectedmedia: 'small',	// active "media query"	id
		prevmedia: null,		// previously active "media query" id
		
		views_color: '#ff5d3b',
		shares_color: '#ffffff'
	},
	
	setup: function (options) {		// setup/constructor method
		var $ref = this;
		
		this.api = new BuzzdashAPI();
		
		if(window.devicePixelRatio !== undefined) {
			this.options.pixelRatio = window.devicePixelRatio;
		}
		
		if(options != null) {
			$.extend(this.options, options);
		} else {
			var dataOptions = {};
		
			if($ref.$el.data("animation-duration") !== undefined) {
				dataOptions["animationDuration"] = $ref.$el.data("animation-duration");
			} 
			
			if($ref.$el.data("campaign-id") !== undefined) {
				dataOptions["campaignID"] = $ref.$el.data("campaign-id");
			} 
			
			if($ref.$el.data("animated") !== undefined) {
				dataOptions["animated"] = $ref.$el.data("animated");
			}
			
			if($ref.$el.data("resizable") !== undefined) {
				dataOptions["resizable"] = $ref.$el.data("resizable");
			}
			
			if($ref.$el.data("can-save") !== undefined) {
				dataOptions["cansave"] = $ref.$el.data("can-save");
			}
			
			if($ref.$el.data("pixel-ratio") !== undefined) {
				dataOptions["pixelRatio"] = $ref.$el.data("pixel-ratio");
			}
			
			if($ref.$el.data("svg") !== undefined) {
				dataOptions["svg"] = $ref.$el.data("svg");
			}
			
			if($ref.$el.data("start-date") !== undefined) {
				dataOptions["startDate"] = $ref.$el.data("start-date");
			}
			
			if($ref.$el.data("end-date") !== undefined) {
				dataOptions["endDate"] = $ref.$el.data("end-date");
			}
			
			$.extend(this.options, dataOptions);
		}
				
		if(this.options.svg) {
			this.options.pixelRatio = 1;
		}
				
		if(this.options.campaignID == null || this.options.campaignID == undefined) {
			alert("Error: can't graph results, no campaign ID was provided");
			
			return;
		}
				
		if(this.options.resizable) {
			$(window).resize(function() {
				$ref.measure();
				
				if($ref.stage.prevwidth !== $ref.stage.width || $ref.stage.prevheight !== $ref.stage.height) {
					if($ref.options.svg) {
						$($ref.svg).attr("width", $ref.stage.width/$ref.options.pixelRatio);
						$($ref.svg).attr("height", $ref.stage.height/$ref.options.pixelRatio);
						
						$($ref.svg).empty();
					} else {
						$ref.$img.attr("width", $ref.stage.width/$ref.options.pixelRatio);
						$ref.$img.attr("height", $ref.stage.height/$ref.options.pixelRatio);
						
						$($ref.canvas).attr("width", $ref.stage.width/$ref.options.pixelRatio);
						$($ref.canvas).attr("height", $ref.stage.height/$ref.options.pixelRatio);
					}
				}
				
				$ref.stage.playhead = 0;					
				$ref.needsRender = true;
			});
		}
		this.measure();
		
		this.createMarkup(this.$el);
		
		// get data
		this.api.campaignLoaded = function(data) {
			$ref.campaignLoaded(data);	
		};
		this.api.loadCampaign(this.options.campaignID);
		
		// requestanimationframe - setup render loops		
		(function animLoop() {
			requestAnimationFrame(animLoop);
			if($ref.needsRender) {
				$ref.render();
			}
		})();
	},
	
	render: function() {
		// local vars
		var $ref = this,
			stage = this.stage,
			data = this.data,
			options = this.options,
			ctx = this.context,
			views = this.stage.views,
			shares = this.stage.shares,
			mq = this.stage.media[stage.selectedmedia],
			
			numbars,
			barwidth,
			bargap,
			scale;
			
		
		numbars = mq.numbars;
		barwidth = mq.barwidth * options.pixelRatio;
		bargap = mq.bargap * options.pixelRatio;
				
		
		// normalisation of data & margins calculations
		if(views.length == 0 && mq != null){
			this.normalizeData();
		}
		
		scale = this.stage.scale;
		
		// draw bargraphs		
		if(options.svg) {
			this.renderSVG(views, shares, numbars, scale, barwidth, bargap);
		} else {
			this.renderCanvas(ctx, views, shares, numbars, scale, barwidth, bargap);
		}
		
		// advance playhead
		$ref.advancePlayhead(options, stage);
		
		if(options.cansave) {
			$ref.$img.attr('src', $ref.canvas.toDataURL());
		}
	},
	
	// specialized drawing code for <svg>
	renderSVG: function(views, shares, numbars, scale, barwidth, bargap) {
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
	
	// specialized drawing code for <canvas>
	renderCanvas: function(ctx, views, shares, numbars, scale, barwidth, bargap) {
		var $ref = this,
			stage = this.stage,
			options = this.options;
	
		ctx.clearRect(0, 0, stage.width, stage.height);
			
		for(var i = 0; i < views.length; i++) {
			var view = views[i], 
				share = shares[i];
						
			if(view !== undefined) {
				if(options.animated) {
					view.anim = share.anim = Math.min(Math.ceil(options.animationDuration/numbars), Math.max(0, stage.playhead - i)); 
				} else {
					view.anim = share.anim = Math.max(1, Math.ceil(options.animationDuration/numbars));
				}
											
				var anim_progress_view = view.anim / Math.ceil(options.animationDuration/numbars),
					anim_progress_share = share.anim / Math.ceil(options.animationDuration/numbars),
					view_height = Math.max(1, view.count*scale) * anim_progress_view,
					share_height = Math.max(1, share.count*scale) * anim_progress_share,
					xoffset = i * (barwidth + bargap) + stage.marginw,
					yoffset_views = Math.min(stage.height/2, Math.round(($ref.data.max_views - view.count*anim_progress_view)*scale)) + stage.marginh,
					yoffset_shares = Math.min(stage.height/2, Math.round($ref.data.max_views*scale)) + bargap + stage.marginh;
					
				ctx.fillStyle = stage.views_color;
				ctx.fillRect(xoffset, yoffset_views, barwidth, view_height);
				
				ctx.fillStyle = stage.shares_color;
				ctx.fillRect(xoffset, yoffset_shares, barwidth, share_height);
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
			scale;
			
		numbars = mq.numbars;
		barwidth = mq.barwidth * options.pixelRatio;
		bargap = mq.bargap * options.pixelRatio;
			
		if(views.length == 0 && mq != null) {
			var timeline,
				data_per_bar,
				counter = 0;
			
			data_per_bar = Math.round(data.timeline.length / numbars);
			
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
				
				counter ++;
			}
			
			scale = ((stage.height) / (max_views + max_shares));
			stage.max_views = max_views;
			stage.max_shares = max_shares;
			
			// margins
			stage.marginw = (stage.width - (views.length * (barwidth + bargap)))/2;
			stage.marginh = (stage.height - ((max_views + max_shares)*scale + bargap));
		}
		
		if(this.DEBUG) {
			console.log("Data Normalized:");
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
		
		if(this.options.svg) {
			this.svg = $(document.createElementNS("http://www.w3.org/2000/svg", "svg"), {Width: this.stage.width/ this.options.pixelRatio, Height: this.stage.height/ this.options.pixelRatio, xmlns:"http://www.w3.org/2000/svg", version: '1.1'})[0];
			
			$el.append(this.svg);
		} else {
			this.canvas = $('<canvas/>', { Width: this.stage.width, Height: this.stage.height})[0];
			this.$img = $('<img />', {Width: this.stage.width / this.options.pixelRatio, Height: this.stage.height/this.options.pixelRatio});
			
			this.context = this.canvas.getContext('2d');
					
			if(this.options.cansave){		
				$el.append(this.$img);
			} else {
				$el.append(this.canvas);
			}
		}
	},
	
	measure: function () {	
		if(this.$el) {
			this.stage.prevwidth = this.stage.width;
			this.stage.prevheight = this.stage.height;
			
			this.stage.width = this.$el.width() * this.options.pixelRatio;
			this.stage.height = this.$el.height() * this.options.pixelRatio;
			
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
	
	campaignLoaded: function (data) {	// JSON is loaded from API
		this.data = data;
		
		if(this.DEBUG) {
			console.log("campaignLoaded");
			console.log(data);
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