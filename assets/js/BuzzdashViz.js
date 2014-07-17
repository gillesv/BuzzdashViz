/*
 *	Buzzdash Visualisation
 *
 *	v1.0 - given basic parameters, draw a responsive and animated chart with data from Buzzdash
 *	
 *	Feature roadmap:
 *
 *	- v1.1 - retina testing
 *	- v1.2 - additional media-queries & sizes
 *	- v2.0 - interactivity: hover on bars to see actual numbers
 */

function BuzzdashViz($el, options) {
	this.$el = $el;
	
	this.setup(options);
}

BuzzdashViz.prototype = {
	
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
	canvas: null, 		// off-screen canvas for rendering
	context: null,		// 2D Drawing context
	
	needsRender: false,	// view invalidation: set to true to re-draw
	
	data: null,			// JSON gotten from the BuzzdashAPI
	stage: {			// stage for rendering	(logical nested objects)
		
		views: [],		// views-bars model
		shares: [],		// shares-bars model
		playhead: 0,	// for keeping track of the animation state
		
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
				
		if(this.options.campaignID == null || this.options.campaignID == undefined) {
			alert("Error: can't graph results, no campaign ID was provided");
			
			return;
		}
				
		if(this.options.resizable) {
			$(window).resize(function() {
				$ref.measure();
				
				if($ref.stage.prevwidth !== $ref.stage.width || $ref.stage.prevheight !== $ref.stage.height) {
					$ref.$img.attr("width", $ref.stage.width/$ref.options.pixelRatio);
					$ref.$img.attr("height", $ref.stage.height/$ref.options.pixelRatio);
					
					$($ref.canvas).attr("width", $ref.stage.width/$ref.options.pixelRatio);
					$($ref.canvas).attr("height", $ref.stage.height/$ref.options.pixelRatio);
					
					$ref.stage.playhead = 0;					
					$ref.needsRender = true;
				}
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
				
		// scale
		scale = (((stage.height - 10)/2) / data.max_views)/2;
		
		// normalisation of data & margins calculations
		if(views.length == 0 && mq != null){
			this.normalizeData();
		}
		
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
		// TODO
	},
	
	// specialized drawing code for <canvas>
	renderCanvas: function(ctx, views, shares, numbars, scale, barwidth, bargap) {
		var stage = this.stage,
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
			
				var view_height = Math.max(Math.round(view.count*scale), 1) * (view.anim / Math.ceil(options.animationDuration/numbars)),
					share_height = Math.max(Math.round(share.count*scale), 1) * (share.anim / Math.ceil(options.animationDuration/numbars)),
					xoffset = i * (barwidth + bargap) + stage.marginw,
					yoffset_views = Math.round(((stage.height)/2) - view_height + stage.marginh/2),
					yoffset_shares = Math.round(((stage.height)/2) + bargap + stage.marginh/2);
					
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
			}
		}
	},
	
	// generate optimized data & calculate margins
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
			scale = (((stage.height - 10)/2) / data.max_views)/2;
			
		numbars = mq.numbars;
		barwidth = mq.barwidth * options.pixelRatio;
		bargap = mq.bargap * options.pixelRatio;
			
		if(views.length == 0 && mq != null) {
			var timeline,
				data_per_bar,
				counter = 0;
			
			data_per_bar = Math.round(data.timeline.length / numbars);
			
			// combine 
			for(var i = 0; i < data.timeline.length; i++) {
				timeline = data.timeline[i];
				
				if(counter%data_per_bar == 0) {
					views.push({
						count: !isNaN(timeline.num_views)? Math.max(timeline.num_views, 0) : 0,
						anim: 0,
						date: timeline.date
					});
					shares.push({
						count: !isNaN(timeline.num_shares)? Math.max(timeline.num_shares, 0) : 0,
						anim: 0,
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
			
			// margins
			stage.marginw = (stage.width - (views.length * (barwidth + bargap)))/2;
			stage.marginh = (stage.height - ((max_views + max_shares)*scale + bargap))/2;
		}
	},
	
	createMarkup: function($el) {
		$el.empty();
		
		this.canvas = $('<canvas/>', { Width: this.stage.width, Height: this.stage.height})[0];
		this.$img = $('<img />', {Width: this.stage.width / this.options.pixelRatio, Height: this.stage.height/this.options.pixelRatio});
		
		this.context = this.canvas.getContext('2d');
				
		if(this.options.cansave){		
			$el.append(this.$img);
		} else {
			$el.append(this.canvas);
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
		
		this.needsRender = true;
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