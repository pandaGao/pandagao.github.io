var app = {
	
	cvs: document.getElementById("cvs"),
	ctx: this.cvs.getContext('2d'),
	maskcvs: document.createElement('canvas'),
	originPic: null,
	mask: null,
	cvsSize: 0,
	drawing: false,
	
	/**
	 * 指针x坐标在画布上的偏移量
	 * @param  {number} x 
	 * @return {number} 偏移量
	 */
	offsetX: function(x) {
		return x - this.cvs.offsetLeft;
	},

	/**
	 * 指针y坐标在画布上的偏移量
	 * @param  {number} y
	 * @return {number} 偏移量
	 */
	offsetY: function(y) {
		return y - this.cvs.offsetTop;
	},

	/**
	 * 生成随机颜色值
	 * @return {rgba color object}
	 */
	randColor: function() {
		return {
			r: Math.floor(Math.random()*255),
			g: Math.floor(Math.random()*255),
			b: Math.floor(Math.random()*255),
			a: 255
		}
	},

	/**
	 * 将画布二值化
	 * @param {context} ctx
	 * @return {BinaryImage}
	 */
	toBinary: function(ctx) {
		var imageData = ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var binary = {
			height: this.cvsSize,
			width: this.cvsSize,
			data: []
		};
		var cSize = imageData.width * imageData.height * 4; 
		for (var i = 0;i<cSize;i+=4) {
			if (imageData.data[i] == 0 && imageData.data[i+1] == 0 && imageData.data[i+2] == 0 && imageData.data[i+3] != 0) {
				binary.data.push(1);
			} else {
				binary.data.push(0);
			}
		}
		binary.data = new Uint8ClampedArray(binary.data);
		return binary;
	},

	/**
	 * 将画布区域化
	 * @param {context} ctx
	 * @return {LabelImage}
	 */
	toLabel: function(ctx) {
		var imageData = ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var label = {
			height: this.cvsSize,
			width: this.cvsSize,
			data: []
		};
		var cSize = imageData.width * imageData.height; 
		for (var i = 0;i<cSize;i++) {
			label.data.push(0);
		}
		return label;
	},

	/**
	 * 搜索并填充区域
	 */
	seedFilling: function() {
		var imageData = this.ctx.getImageData(0,0,this.cvsSize,this.cvsSize);
		var binary = this.toBinary(this.ctx);
		var label = this.toLabel(this.ctx);
		var area = 0;
		var fillstyle = {};
		for (var i=0;i<this.cvsSize;i++) {
			for (var j=0;j<this.cvsSize;j++) {
				if (binary.data[i*binary.width+j] === 0 && label.data[i*label.width+j] === 0) {
					label.data[i*label.width+j] = ++area;
					var lStack = [];
					lStack.push([i,j]);
					fillstyle = this.randColor();
					while (lStack.length > 0) {
						var temp = lStack.shift();
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4] = fillstyle.r;
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4+1] = fillstyle.g;
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4+2] = fillstyle.b;
						imageData.data[(temp[0]*this.cvsSize+temp[1])*4+3] = fillstyle.a;
						// top
						if ((temp[0]-1)>=0 && binary.data[(temp[0]-1)*binary.width+temp[1]] === 0 && label.data[(temp[0]-1)*label.width+temp[1]] === 0) {
							label.data[(temp[0]-1)*label.width+temp[1]] = area;
							lStack.push([(temp[0]-1),temp[1]]);
						}
						// left
						if ((temp[1]-1)>=0 && binary.data[temp[0]*binary.width+(temp[1]-1)] === 0 && label.data[temp[0]*label.width+(temp[1]-1)] === 0) {
							label.data[temp[0]*label.width+(temp[1]-1)] = area;
							lStack.push([temp[0],(temp[1]-1)]);
						}
						// bottom
						if ((temp[0]+1)>=0 && binary.data[(temp[0]+1)*binary.width+temp[1]] === 0 && label.data[(temp[0]+1)*label.width+temp[1]] === 0) {
							label.data[(temp[0]+1)*label.width+temp[1]] = area;
							lStack.push([(temp[0]+1),temp[1]]);
						}
						// right
						if ((temp[1]+1)>=0 && binary.data[temp[0]*binary.width+(temp[1]+1)] === 0 && label.data[temp[0]*label.width+(temp[1]+1)] === 0) {
							label.data[temp[0]*label.width+(temp[1]+1)] = area;
							lStack.push([temp[0],(temp[1]+1)]);
						}
					}
				}
			}
		}
		this.ctx.putImageData(imageData,0,0);
		this.originPic = imageData;
	},

	/**
	 * 设置蒙版
	 * @param {number} type 蒙版类型 0 无 1 圆形 2 三角形
	 */
	setMask: function(type) {
		var imageData = this.mask.createImageData(this.originPic);
		var cSize = imageData.width * imageData.height; 
		for (var i = 0;i<cSize;i++) {
			imageData.data[i*4] = this.originPic.data[i*4];
			imageData.data[i*4+1] = this.originPic.data[i*4+1];
			imageData.data[i*4+2] = this.originPic.data[i*4+2];
			imageData.data[i*4+3] = this.originPic.data[i*4+3];
		}
		this.mask.clearRect(0,0,this.cvsSize,this.cvsSize);
		this.mask.fillStyle = "#000000";
		switch(type) {
			case 1:
				this.mask.beginPath();
				this.mask.arc(this.cvsSize/2,this.cvsSize/2,this.cvsSize/2,0,2*Math.PI);
				this.mask.closePath();
				break;
			case 2:
				this.mask.beginPath();
				this.mask.moveTo(this.cvsSize/2,this.cvsSize/2-this.cvsSize*Math.sqrt(3)/4);
				this.mask.lineTo(0,this.cvsSize/2+this.cvsSize*Math.sqrt(3)/4);
				this.mask.lineTo(this.cvsSize,this.cvsSize/2+this.cvsSize*Math.sqrt(3)/4);
				this.mask.closePath();
				break;
			default:
				this.mask.beginPath();
				this.mask.rect(0,0,this.cvsSize,this.cvsSize);
				this.mask.closePath();
		}
		this.mask.fill();
		var bMask = this.toBinary(this.mask);
		for (var i=0;i<this.cvsSize;i++) {
			for (var j=0;j<this.cvsSize;j++) {
				if (bMask.data[i*bMask.width+j] == 0) {
					imageData.data[(i*this.cvsSize+j)*4] = 0;
					imageData.data[(i*this.cvsSize+j)*4+1] = 0;
					imageData.data[(i*this.cvsSize+j)*4+2] = 0;
					imageData.data[(i*this.cvsSize+j)*4+3] = 0;
				}
			}
		}
		this.ctx.putImageData(imageData,0,0);
	},

	/**
	 * 开始绘制笔触
	 * @param  {number} x - pointer x in page
	 * @param  {number} y - pointer y in page
	 */
	startDrawing: function(x,y) {
		this.ctx.beginPath();
		this.ctx.rect(this.offsetX(x),this.offsetY(y),2,2);
		this.ctx.fill();
		this.ctx.beginPath();
		this.ctx.moveTo(this.offsetX(x),this.offsetY(y));
		this.drawing = true;
	},

	/**
	 * 结束绘制笔触
	 */
	finishDrawing: function() {
		this.drawing = false;
	},

	/**
	 * 移动时绘制笔触
	 * @param  {number} x - pointer x in page
	 * @param  {number} y - pointer y in page
	 */
	drawToPoint: function(x,y) {
		this.ctx.lineWidth = 2;
		this.ctx.lineTo(this.offsetX(x),this.offsetY(y));
		this.ctx.stroke();
	},

	saveCanvas: function() {
		var image = document.createElement('img');
		image.src = this.cvs.toDataURL('image/png');
		document.body.appendChild(image);
		this.cvs.style.display = "none";
		image.style.marginLeft = -this.cvsSize/2+"px";
		image.style.marginTop = -this.cvsSize/2+"px";
	},

	/**
	 * 初始化应用
	 */
	init: function() {
		var w = window.innerWidth;
		var h = window.innerHeight;
		this.cvsSize = w>h ? h : w;
		this.cvs.width = this.cvsSize;
		this.cvs.height = this.cvsSize;
		this.maskcvs.width = this.cvsSize;
		this.maskcvs.height = this.cvsSize;
		this.mask = this.maskcvs.getContext('2d');
		this.cvs.style.marginLeft = -this.cvsSize/2+"px";
		this.cvs.style.marginTop = -this.cvsSize/2+"px";

		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0,0,this.cvsSize,this.cvsSize);

		this.cvs.addEventListener('mousedown',function(e){
			app.startDrawing(e.pageX,e.pageY);
		});
		this.cvs.addEventListener('mouseup',function(e) {
			app.finishDrawing();
		});
		this.cvs.addEventListener('mousemove',function(e) {
			if (app.drawing) {
				app.drawToPoint(e.pageX,e.pageY);
			}
			e.preventDefault();
		});
		cvs.addEventListener('touchstart',function(e) {
			var touch = e.targetTouches[0];
			app.startDrawing(touch.pageX,touch.pageY);
		});
		cvs.addEventListener('touchend',function(e) {
			app.finishDrawing();
		});
		cvs.addEventListener('touchmove',function(e) {
			if (app.drawing) {
				var touch = e.targetTouches[0];
				app.drawToPoint(touch.pageX,touch.pageY);
			}
			e.preventDefault();
		});
	}
};

app.init();

