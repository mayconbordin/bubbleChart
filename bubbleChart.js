/*
 * BubbleChart
 *
 * Framework agnostic version of moochart
 * @author Maycon Bordin
 *
 * moochart:
 * @version		0.1b1
 * @license		MIT-style license
 * @author		Johan Nordberg <norddan@gmail.com>
 * @infos		http://moochart.coneri.se
 * @copyright	Author
 *
*/

var Util = {
	mergeObj: function(a, b) {
		for (var attrname in b)
			a[attrname] = b[attrname];
	},
	setStyles: function(el, styles) {
		for (var style in styles)
			el.style[style] = styles[style];
	},
	getPosition: function(el) {
		var x, y = 0;

		x = el.offsetLeft;
		y = el.offsetTop;
		el = el.offsetParent;
		
		while(el != null) {
			x = parseInt(x) + parseInt(el.offsetLeft);
			y = parseInt(y) + parseInt(el.offsetTop);
			el = el.offsetParent;
		}

		return {top: y, left: x};
	}
};

var Chart = {};

Chart.Bubble = function(container, options) {
	this.initialize(container, options);
};

Chart.Bubble.prototype = {
	options: {
		width: 600,
		height: 400,
		xmin: 0, xmax: 100,
		ymin: 0, ymax: 100,
		zmin: 0, zmax: 1,
		xsteps: 5,
		ysteps: 5,
		xlabel: null,
		ylabel: null,
		bubbleSize: 30,
		lineColor: '#000'
	},
	
	initialize: function(container, options) {
		var thisObj = this;
		Util.mergeObj(this.options, options);
		
		this.options.xsteps--;
		this.options.xsteps = (this.options.xsteps > 50) ? 50 : ((this.options.xsteps < 1) ? 1 : this.options.xsteps);
		
		this.options.ysteps--;
		this.options.ysteps = (this.options.ysteps > 50) ? 50 : ((this.options.ysteps < 1) ? 1 : this.options.ysteps);
		
		this.container = document.getElementById(container);
		Util.setStyles(this.container, {
			'width': this.options.width + "px",
			'height': this.options.height + "px"
		});

		this.canvas = document.createElement('canvas');
		
		var div = document.createElement('div');
		Util.setStyles(div, {
			'textAlign': 'center',
			'backgroundColor': '#8b2e19',
			'width': this.options.width + "px",
			'height': this.options.height + "px",
			'color': '#fff'
		});

		div.innerHTML = 'Your browser does not support the canvas element, get a better one!';
		
		this.canvas.appendChild(div);
		
		this.canvas.width = this.options.width;
		this.canvas.height = this.options.height;
		
		this.container.appendChild(this.canvas);
		
		if (!this.canvas.getContext) return false;
		
		this.overlay = document.createElement('div');
		Util.setStyles(this.overlay, {
			'position': 'relative',
			'width': this.options.width + "px",
			'height': this.options.height + "px",
			'top': 0-this.options.height-3 + "px",
			'marginBottom': 0-this.options.height-3 + "px",
			'fontFamily': 'Helvetica, Arial, sans-serif',
			'z-index': 240
		});

		this.overlay.onmousemove = function(e) {
			thisObj.mouseHandler(e);
		};
		this.overlay.onmouseout = function(e) {
			thisObj.tip.style.display = 'none';
			thisObj.activeBubble = -1;
			thisObj.redraw();
		};
		
		this.container.appendChild(this.overlay);
		
		this.tip = document.createElement('div');
		this.tip.innerHTML = '';
		Util.setStyles(this.tip, {
			'position': 'absolute',
			'display': 'none',
			'border': '2px solid #000',
			'backgroundColor': '#262626',
			'padding': '0.5em',
			'borderRadius': '3px',
			'whiteSpace': 'nowrap',
			'zIndex': 250,
			'color': '#fff',
			'fontSize': '11px',
			'lineHeight': '1.3em',
			'textAlign': 'left'
		});
		
		this.overlay.appendChild(this.tip);
		
		this.ctx = this.canvas.getContext('2d');
		
		this.bubbles = new Array;
		this.activeBubble = -1;
		
		this.paddingTop = 30;
		this.paddingLeft = 40;
		this.paddingBottom = 30;
		this.paddingRight = 40;
		
		if (this.options.ylabel) this.paddingLeft+=30;
		if (this.options.xlabel) this.paddingBottom+=20;
		
		this.xwork = (this.options.width - (this.paddingLeft + this.paddingRight)) - this.options.bubbleSize * 2;
		this.ywork = (this.options.height - (this.paddingTop + this.paddingBottom)) - this.options.bubbleSize * 2;
		
		this.xmax = this.options.xmax;
		this.xmin = this.options.xmin;
		
		this.ymax = this.options.ymax;
		this.ymin = this.options.ymin;
		
		this.zmax = this.options.zmax;
		this.zmin = this.options.zmin;
		
		this.xnumbers = new Array;
		this.ynumbers = new Array;
		
		var xstep = this.xwork / this.options.xsteps;
		var ystep = this.ywork / this.options.ysteps;
		
		for (var i = 0; i <= this.options.xsteps; i++) {
			var el = document.createElement('div');
			el.innerHTML = '';
			Util.setStyles(el, {
				'position': 'absolute',
				'fontSize': '10px',
				'lineHeight': '20px',
				'height': '20px',
				'width': xstep + 'px',
				'textAlign': 'center',
				'top': (this.options.height - this.paddingBottom + 10) + 'px',
				'left': (this.paddingLeft + this.options.bubbleSize) - (xstep / 2) + i * xstep + 'px',
				'color': this.options.lineColor
			});
			this.xnumbers.push(el);
			this.overlay.appendChild(el);
		}
		
		for (var i = 0; i <= this.options.ysteps; i++) {
			var el = document.createElement('div');
			el.innerHTML = '';
			Util.setStyles(el, {
				'position': 'absolute',
				'fontSize': '10px',
				'lineHeight': '20px',
				'height': '20px',
				'verticalAlign': 'middle',
				'width': (this.paddingLeft - 15) + 'px',
				'textAlign': 'right',
				'top': (this.options.bubbleSize + (i * ystep) + this.paddingTop - 10) + 'px',
				'left': '0px',
				'color': this.options.lineColor
			});
			this.ynumbers.push(el);
			this.overlay.appendChild(el);
		}
		
		var labelStyles = {
			'position': 'absolute',
			'fontSize': '10px',
			'lineHeight': '20px',
			'width': (this.xwork) + 'px',
			'textAlign': 'center',
			'bottom': '0px',
			'letterSpacing': '0.1em',
			'left': (this.paddingLeft + this.options.bubbleSize ) + 'px',
			'color': this.options.lineColor
		}
		
		if (this.options.xlabel) {
			this.xlabel = document.createElement('div');
			this.xlabel.innerHTML = this.options.xlabel;
			Util.setStyles(this.xlabel, labelStyles);
			
			this.overlay.appendChild(this.xlabel);
			this.overlay.appendChild(this.ylabel);
			
		}
		
		if (this.options.ylabel) {
			
			var ylabelText = '';
			var yl = this.options.ylabel;
			
			for(var i = 0; i < yl.length; i++) {
				ylabelText += "<br />" + yl.charAt(i);
			}

			this.ylabel = document.createElement('div');
			this.ylabel.innerHTML = ylabelText;
			Util.setStyles(this.ylabel, labelStyles);
			Util.setStyles(this.ylabel, {
				'width': '20px',
				'height': 1.1 * (i+2) + 'em',
				'left': '0px',
				'top': '0px',
				'lineHeight': '1.1em'
			});

			this.overlay.appendChild(this.ylabel);
		
			var ylh = this.ylabel.offsetHeight;
			this.ylabel.style.top = (this.paddingTop + this.options.bubbleSize) + ((this.ywork - ylh) / 2);
		
		}
		
		this.drawLabels();
		this.updateNumbers();
		this.redraw();
	},
	
	
	drawLabels: function() {
		this.ctx.lineWidth = 4;
		this.ctx.lineCap = 'round';
	  	this.ctx.strokeStyle = this.options.lineColor;
	  	this.ctx.beginPath();
	  	this.ctx.moveTo(this.paddingLeft, this.paddingTop);
		this.ctx.lineTo(this.paddingLeft, this.options.height - this.paddingBottom);
		this.ctx.lineTo(this.options.width - this.paddingRight, this.options.height - this.paddingBottom);
	  	this.ctx.stroke();
		
		var xstep = this.xwork / this.options.xsteps;
		var ystep = this.ywork / this.options.ysteps;
		
	  	this.ctx.beginPath();
		this.ctx.lineWidth = 2;
		
		for (var i = 0; i <= this.options.xsteps; i++) {
			var mov = this.paddingLeft + this.options.bubbleSize + xstep * i;
	  		this.ctx.moveTo(mov, this.options.height - this.paddingBottom);
			this.ctx.lineTo(mov, this.options.height - this.paddingBottom + 10);
		}
		
		for (var i = 0; i <= this.options.ysteps; i++) {
			var mov = this.options.height - (this.paddingBottom + this.options.bubbleSize + ystep * i);
		  	this.ctx.moveTo(this.paddingLeft, mov);
			this.ctx.lineTo(this.paddingLeft - 10, mov);
		}
		
	  	this.ctx.stroke();
	
	},
	
	// color can be #fff, rgb(123,13,2) or array - [121,312,34]
	addBubble: function(x, y, z, color, tip) {
		
		if (typeof(color) == 'array') color = 'rgb('+color.join(',')+')';
		
		x = parseInt(x);
		y = parseInt(y);
		z = parseInt(z);
		
		tip = tip.replace(/%x/ig, x);
		tip = tip.replace(/%y/ig, y);
		tip = tip.replace(/%z/ig, z);
		
		this.bubbles.push({
			x: x,
			y: y,
			z: z,
			color: color,
			tip: tip
		});
				
		if (z > this.zmax) this.zmax = z;
		if (z < this.zmin) this.zmin = z;
		
		if (x > this.xmax) this.xmax = x;
		if (x < this.xmin) this.xmin = x;
		
		if (y > this.ymax) this.ymax = y;
		if (y < this.ymin) this.ymin = y;
		
		this.updateNumbers();
		
		// Big goes to the back!
		this.bubbles.sort(function(a, b) { return b.z - a.z; });
	},
	
	updateNumbers: function() {
		var xstep = (this.xmax - this.xmin) / this.options.xsteps;
		for (var i=0; i<this.xnumbers.length; i++) {
			this.xnumbers[i].innerHTML = Math.round(xstep * i + this.xmin);
		}
		
		var ystep = (this.ymax - this.ymin) / this.options.ysteps;
		for (var i=0; i<this.ynumbers.length; i++) {
			this.ynumbers[i].innerHTML = (this.ymax + this.ymin) - Math.round((ystep*i) + this.ymin);
		}
	
	},
	
	mouseHandler: function(e) {
		var pos = Util.getPosition(this.canvas);
		var x = e.pageX - pos.left, y = e.pageY - pos.top;
		var active = -1, l = this.bubbles.length;
		
		for (var i = l - 1; i >= 0; i--) {
			var cx = x - this.bubbles[i].realx, cy = y - this.bubbles[i].realy, cz = this.bubbles[i].realz + 1;
			if ((cx * cx) + (cy * cy) <= (cz * cz)) {
				active = i;
				break;
			}
		}
		
		if (this.activeBubble != active) {
			this.activeBubble = active;
			this.redraw();
			if (this.activeBubble >= 0) {
				this.tip.innerHTML = this.bubbles[this.activeBubble].tip;
				this.tip.style.display = 'block';
			} else {
				this.tip.style.display = 'none';
			}
		}
		
		if (this.activeBubble >= 0) {
			this.tip.style.left = x + 10 + "px";
			this.tip.style.top = y + 15 + "px";
		}
		
		
	},
	
	redraw: function() {
		var l = this.bubbles.length;
		this.ctx.clearRect(this.paddingLeft + 2, 0, this.options.width, this.options.height - (this.paddingBottom + 2));
		this.ctx.lineWidth = 1;
		for(var i = 0; i < l; i++) {
			var x = Math.round(((this.bubbles[i].x - this.xmin) / (this.xmax - this.xmin)) * this.xwork) + this.paddingLeft + this.options.bubbleSize;
			var y = (this.ywork - Math.round(((this.bubbles[i].y - this.ymin) / (this.ymax - this.ymin)) * this.ywork)) + this.paddingTop + this.options.bubbleSize;
			var z = Math.round(((this.bubbles[i].z - this.zmin) / (this.zmax - this.zmin)) * (this.options.bubbleSize - 8)) + 5;

			this.ctx.beginPath();
			this.ctx.globalAlpha = 1;
			this.ctx.fillStyle = this.bubbles[i].color;
			this.ctx.strokeStyle = this.bubbles[i].color;
			this.ctx.arc(x, y, z, 0, Math.PI * 2, true);
			this.ctx.stroke();
			if (this.activeBubble != i) this.ctx.globalAlpha = 0.6;
			this.ctx.fill();
			
			this.bubbles[i].realx = x; this.bubbles[i].realy = y; this.bubbles[i].realz = z;
		}
	},
	
	clear: function() {
    	this.ctx.clearRect(0, 0, this.options.width, this.options.width);
		this.drawLabels();
	},
	
	empty: function() {
		this.xmax = this.options.xmax;
		this.xmin = this.options.xmin;
		this.ymax = this.options.ymax;
		this.ymin = this.options.ymin;
		this.zmax = this.options.zmax;
		this.zmin = this.options.zmin;
		this.addBubble(this.xmax, this.ymax, this.zmax, [0, 0, 0], '');
		delete this.bubbles;
		this.bubbles = new Array;
		this.redraw();
	}
};
