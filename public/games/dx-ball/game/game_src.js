var mbbkgrnd_img = new Image();mbbkgrnd_img.src = 'game/images/mbbkgrnd.png';
var sphere_img   = new Image();sphere_img.src   = 'game/images/sphere.png';
var Highscor_img = new Image();Highscor_img.src = 'game/images/Highscor.png';
var Mainmenu_img = new Image();Mainmenu_img.src = 'game/images/Mainmenu.png';
var Intro_img    = new Image();Intro_img.src    = 'game/images/Intro.png';
var bigbolt_img  = new Image();bigbolt_img.src  = 'game/images/bigbolt.png';

audioName = [
"Ethno_pa.mp3",
"Acker-gs.mp3",
"12flight.mp3",
"Brain.mp3",
"Freebee.mp3",
"Gmfigaro.mp3",

"Ao-laser",
"Bang",
"Bassdrum",
"Boing",
"Byeball",
"Effect",
"Effect2",
"Fanfare",
"Glass",
"Gunfire",
"Humm",
"Orchblas",
"Orchestr",
"Padexplo",
"Peow!",
"Ricochet",
"Saucer",
"Sweepdow",
"Swordswi",
"Tank",
"Thudclap",
"Voltage",
"Whine",
"Wowpulse",
"Xploshor",
"Xplosht1"
];
//http://borodinart.ru/projects/dx-ball/audio/sound/Ethno_pa.mp3
audioFile = [];
for(i=0;i<audioName.length;i++){
	audioFile[audioName[i]] = document.createElement('audio');
	if(audioName[i][audioName[i].length-1]=='3'){
		source = document.createElement('source');source.setAttribute('src', 'game/audio/sound/'+audioName[i]);
		audioFile[audioName[i]].appendChild(source);
	}else{
		source = document.createElement('source');source.setAttribute('src', 'game/audio/sfx/wav/'+audioName[i]+'.wav');
		audioFile[audioName[i]].appendChild(source);
		source = document.createElement('source');source.setAttribute('src', 'game/audio/sfx/mp3/'+audioName[i]+'.mp3');
		audioFile[audioName[i]].appendChild(source);
		source = document.createElement('source');source.setAttribute('src', 'game/audio/sfx/aac/'+audioName[i]+'.aac');
		audioFile[audioName[i]].appendChild(source);
	}
	audioFile[audioName[i]].load();
}

function dx_ball(soundon, saveron){
	window.soundon = soundon;
	window.saveron = saveron;
	myFonts = new sbk();
	font = [];
	animframe = 0;
	color = ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#000000', '#000000', '#FFFFFF', '#EBEBEB', '#DBDBDB', '#CBCBCB', '#BBBBBB', '#A7A7A7', '#979797', '#878787', '#777777', '#636363', '#535353', '#434343', '#333333', '#1F1F1F', '#0F0F0F', '#000000', '#DBDBDB', '#CFCFD3', '#C3C3CB', '#B7B7C3', '#AFAFBB', '#A3A3B7', '#9B9BAF', '#8F8FA7', '#87879F', '#7F7F97', '#777793', '#6B6B8B', '#636383', '#5B5B7B', '#535373', '#4F4F6F', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#001343', '#001B4F', '#0B235B', '#132F6B', '#1F3F77', '#2B4B87', '#3B5B93', '#4B6F9F', '#5B7FAF', '#6F8FBB', '#87A3C7', '#9FB7D7', '#B7CBE3', '#D3E3F3', '#1FCFFF', '#17AFF3', '#0F93EB', '#0B77E3', '#0057DB', '#003FD3', '#0B6BE7', '#1F9FFF', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#FF0000', '#E30000', '#CB0000', '#B30000', '#9B0000', '#830000', '#B30000', '#E30000', '#FFFF00', '#F3E700', '#EBD700', '#DFC300', '#D7B300', '#CFA300', '#E7CF00', '#FFFF00', '#CFCFCF', '#B7B7B7', '#A3A3A3', '#8F8F8F', '#7B7B7B', '#676767', '#8F8F8F', '#B7B7B7', '#838383', '#6F6F6F', '#5F5F5F', '#4F4F4F', '#3F3F3F', '#2F2F2F', '#4F4F4F', '#6F6F6F', '#5F5F5F', '#4B4B4B', '#373737', '#232323', '#131313', '#000000', '#232323', '#4B4B4B', '#FF7F9B', '#E76B87', '#CF5773', '#B74763', '#9F3753', '#872B47', '#B74763', '#E76B87', '#0000FF', '#0000DF', '#0000C3', '#0000A3', '#000087', '#00006B', '#0000A3', '#0000DF', '#00FF00', '#00DF00', '#00BF00', '#00A300', '#008300', '#006700', '#00A300', '#00DF00', '#00B793', '#00A38B', '#00937F', '#008377', '#00736B', '#00635F', '#008377', '#00A38B', '#8300BB', '#6F00A7', '#5B0093', '#47007F', '#37006B', '#2B0057', '#47007F', '#6F00A7', '#FF8B00', '#EF7B00', '#E36B00', '#D35B00', '#C74F00', '#BB4300', '#D35B00', '#EF7B00', '#E7B300', '#D79F00', '#C78F00', '#B77F00', '#A76F00', '#976300', '#BF8700', '#E7B300', '#FF0057', '#EF0057', '#DF0057', '#CF0057', '#BF0053', '#AF0053', '#CF0057', '#EF0057', '#FF00FF', '#E300E3', '#CB00CB', '#AF00AF', '#970097', '#7F007F', '#AF00AF', '#E300E3', '#00FFFF', '#00E3E3', '#00CBCB', '#00AFAF', '#009797', '#007F7F', '#00AFAF', '#00E3E3', '#FF83DB', '#E773C3', '#D363AB', '#BB5797', '#A74B83', '#933F6F', '#BB5797', '#E773C3', '#EBD3BB', '#E7E7E7', '#F3B377', '#FF7F00', '#FF7F00', '#F7932F', '#F3AB5F', '#EFBF8F', '#008B00', '#007B00', '#006B00', '#005B00', '#004B00', '#003F00', '#006300', '#008B00', '#E3E300', '#A7CF00', '#73BF00', '#47AB00', '#239B00', '#008700', '#00770F', '#006723', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#FFFFFF', '#000000', '#960000', '#008100', '#818100', '#000084', '#960084', '#008181', '#C1C1C1', '#B5DDC0', '#D7D1C9', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#BF00D8', '#AD00C8', '#9A00B8', '#8700A8', '#740097', '#610087', '#4D0076', '#390065', '#240054', '#0F0042', '#0F0031', '#00001E', '#CD00FF', '#001E30', '#000B0B', '#000000', '#FED407', '#FF9402', '#FF7411', '#DF5200', '#BC4104', '#AB3000', '#861E00', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#0000A5', '#0000A5', '#00007D', '#000075', '#00006C', '#000066', '#000062', '#00005B', '#000057', '#000053', '#00004E', '#00004C', '#000048', '#000044', '#000041', '#00003D', '#00003B', '#000036', '#000034', '#000032', '#00002D', '#00002B', '#000029', '#000024', '#000022', '#00001F', '#00001D', '#00001B', '#000016', '#000014', '#000011', '#00000F', '#00000D', '#00000A', '#000008', '#000006', '#000005', '#000003', '#000003', '#000002', '#000001', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#020000', '#070000', '#100000', '#200000', '#2B0000', '#3A0000', '#4E0000', '#620000', '#BC0000', '#BC0000', '#000000', '#00FFF3', '#00FFF3', '#00FFF7', '#00FFF7', '#00FFFB', '#00FFFB', '#00FFFF', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#00DDF1', '#FFFFFF', '#000000', '#FFFFFF', '#F3F3F3', '#E4E4E4', '#D8D8D8', '#CCCCCC', '#C0C0C0', '#B4B4B4', '#A9A9A9', '#9C9C9C', '#909090', '#848484', '#787878', '#6B6B6B', '#5F5F5F', '#525252', '#454545', '#00227A', '#002B86', '#003497', '#003DA3', '#0045B3', '#0052BF', '#005FCF', '#00A0FF', '#00FF00', '#00EC00', '#00D800', '#00C800', '#00B400', '#00A500', '#000000', '#000000', '#D43400', '#E23D00', '#EF4500', '#FC4E00', '#FF5B00', '#FF6300', '#FF7000', '#FFA400', '#FFFF00', '#FFEC00', '#FFD800', '#FFC800', '#FFB400', '#FFA400', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#FFFBF0', '#006EA8', '#818181', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF'];



	FontList = [
	['Mball2.sbk',   0, 1],
	['Mainmenu.sbk', 0, 1],
	['Chisel2.sbk',  1, 1],
	['Sysfont.sbk',  0, 5],
	['Thefont.sbk',  0,14],
	['Candy.sbk',    1, 6],
	['Sfont.sbk',    0, 1]
	]

	lFile = 0;
	window.canvas = document.getElementById('dx-ball');
	window.canvas.width = 2000;window.canvas.height = 2000;
	window.ctx = canvas.getContext("2d");

	function loadfile(){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'game/'+FontList[lFile][0], true);
		xhr.responseType = 'arraybuffer';
		xhr.onload = function(e) {
		 file = new Uint8Array(this.response);
		 myFonts.getFont(FontList[lFile][0], file, FontList[lFile][1], FontList[lFile][2]);
		 lFile++;
		 if(lFile<FontList.length)loadfile();else{init();}
		};
		xhr.send();
	}
	loadfile();

	function sbk(){
		this.font = [];
		this.getFont = function(name, data, colorMode, space){
			this.font[name] = {};
			this.font[name].space = space;
			this.fontFile = data;
			this.sb = 16;
			this.font[name].chars = this.fontFile[0];
			this.font[name].char = new Array();
			for(c=0;c<this.font[name].chars;c++){
				this.width  = this.fontFile[this.sb-12];
				this.height = this.fontFile[this.sb-8];
				if(this.fontFile[this.sb-11]==1)this.width+=256;
				if(c==0)this.maxHeight = this.height;
				this.sy = this.maxHeight-this.height;
				this.x=0;this.y=this.height;
				if(this.fontFile[this.sb-4]!=0)this.char = String.fromCharCode(this.fontFile[this.sb-4]);
				else{
					this.char = c;
					if(name=='Mball2.sbk'&&c==8){
						this.char = c+animframe;
						temp = color[224];
						for(i=224;i<231;i++){
							color[i]=color[i+1];
						}
						color[231] = temp;
						animframe+=0.1;
						if(animframe<0.8)c--;
					}
				}
				if(this.fontFile[this.sb-3]<128)descender = -this.fontFile[this.sb-3]; else descender = 256 -this.fontFile[this.sb-3];
				this.font[name].char[this.char] = new Object;
				this.font[name].char[this.char].width = this.width;
				this.font[name].char[this.char].height = this.height;
				this.font[name].char[this.char].y = this.sy+descender;
				ctx.clearRect(0,0,300,300);
				canvas.height = this.height+1;
				canvas.width  = this.width+1;
				for(i=this.sb+1;i<=this.width*this.height+this.sb;i++){
					ctx.fillStyle=color[this.fontFile[i]+colorMode*256];
					if(this.fontFile[i]==0)ctx.fillStyle = 'rgba(0,0,0,0)';
					ctx.fillRect(this.x,this.y,1,1);
					this.x++;if(this.x>=this.width){this.x=0;this.y--}
				}
				if(animframe<0.1||animframe>0.8)this.sb+=this.width*this.height+13;
				//this.font[name].char[this.char].img = ctx.getImageData(0,0,this.width,this.height+1);
				this.font[name].char[this.char].img = new Image();
				this.font[name].char[this.char].img.src = canvas.toDataURL("image/png");
			}
			canvas.height = 1; canvas.width = this.font[name].space;this.font[name].char[' '] = new Object;
			this.font[name].char[' '].width = this.font[name].space;this.font[name].char[' '].height = 1;
			this.font[name].char[' '].img = new Image();
			this.font[name].char[' '].img.src = canvas.toDataURL("image/png");
		}
		this.strokeText = function(str,f,x,y){
			str+='';
			curX = x;
			for(i=0;i<str.length;i++){
				ctx.drawImage(this.font[f].char[str[i]].img, curX , y+this.font[f].char[str[i]].y-1);
				curX+=this.font[f].char[str[i]].width;
				curX+=1;
			}
		}
		this.fillImg = function(n,f,x,y){
			ctx.drawImage(this.font[f].char[n].img, x, y-1);
		}
	}

	function init(){
		var canvas = document.getElementById('dx-ball');
		canvas.width = 640;canvas.height = 480;
		var ctx = canvas.getContext("2d");
		game();
	}
}

game = function(){

	var remains = 1;
	var delta   = 1;
	var scrollPos = 0;
	var realframe = 0;
	var cof = 1;
	var music_N = 0;
	var pauseTime;
	var music = audioFile[audioName[music_N]].cloneNode(true);
	window.cl =  false;

	user = new Object();
	window.user = user;
	user.name   = '';
	window.loadScore = loadScore;
	user.startTime = 0;
	paused = paus = false;

	if(window.soundon){
		audioFile['Whine'].loop = 'loop';
		audioFile['Voltage'].loop = 'loop';
		audioFile['Whine'].play();
	}

	naudio = 0;
	nflash = 0;
	audio   = new Array();
	balls   = new Array();
	bricks  = new Array();
	bullets = new Array();
	bang    = new Array();
	flash   = new Array();
	records = new Array();

function file_get_contents( url ) {
	var req = null;
	try { req = new ActiveXObject("Msxml2.XMLHTTP"); } catch (e) {
		try { req = new ActiveXObject("Microsoft.XMLHTTP"); } catch (e) {
			try { req = new XMLHttpRequest(); } catch(e) {}
		}
	}
	if (req == null) throw new Error('XMLHttpRequest not supported');
	req.open("GET", url, false);
	req.send(null);
	return req.responseText;
}
file = file_get_contents('game/default.bds');

	function playAudio(name){
		if(soundon){
			audio[naudio] = audioFile[name].cloneNode(true);
			audio[naudio].play();
			naudio++;
			if(64<=naudio)naudio=0;
		}
	}

	function setscore(s){
		myFonts.strokeText(s,'Thefont.sbk',30,1);
		for(i=1;i<user.lives;i++){
			myFonts.fillImg(30,'Mball2.sbk',620-22*i,2);
		}
	}

	function Tball(){
		this.x = 320;
		this.y = 440;
		this.is = true;
		this.anim   = 0;
		this.xSpeed = 0;
		this.ySpeed = 0;
		this.magnet = 0;
		this.draw = function(){
			if(!shadow.drawing){
				if(bonus.fireball){
					myFonts.fillImg(60,'Mball2.sbk', parseInt(this.x-4), parseInt(this.y-4));
				}else if(bonus.shball){
					myFonts.fillImg(54,'Mball2.sbk', parseInt(this.x-2), parseInt(this.y-2));
				}else{
					myFonts.fillImg(0,'Mball2.sbk', parseInt(this.x-4), parseInt(this.y-4));
				}
			}
		}
		this.move = function(){
			cof = Math.sqrt(Math.pow(this.xSpeed, 2)+Math.pow(this.xSpeed, 2));
			//if(cof<1)cof=1
			this.x+=this.xSpeed*6*delta;
			this.y+=this.ySpeed*6*delta;

			if(this.y>476){
				this.is = false;
				death(false);
			}
			if(this.y<4){this.y=4;this.ySpeed *=-1;playAudio('Bassdrum');}
			if(this.x>615){this.x = 615;this.xSpeed *=-1;playAudio('Bassdrum');}
			if(this.x<23){this.x = 23;this.xSpeed *=-1;playAudio('Bassdrum');}

			if(bonus.fireball&&parseInt(Math.random()*6)==0&&!this.magnet){
				flash[nflash] = new Tflash(this.x,this.y,this.xSpeed/-12,this.ySpeed/-12,24, 6,"255,0,0");
				nflash++;if(nflash>=128)nflash=0;
			}

			if(this.y>45&&this.y<350&&this.x>20&&this.x<620){
				for(y=parseInt((this.y-45)/15)-1;y<parseInt((this.y-45)/15)+1;y++)for(x=parseInt((this.x-20)/30)-1;x<parseInt((this.x-20)/30)+1;x++){
					if(bricks[x][y].type!=0&&this.x>bricks[x][y].x-5&&this.x<bricks[x][y].x+35&&this.y>bricks[x][y].y-5&&this.y<bricks[x][y].y+20){
						if(bonus.fireball){bricks[x][y].type=8;i=bang.length;bang[i] = new Tbang(this.x,this.y)}
						bricks[x][y].dell(x,y);
						if((this.x-(bricks[x][y].x-5)<this.y-(bricks[x][y].y-5)&&this.x-(bricks[x][y].x-5)<(bricks[x][y].y+20)-this.y)||((bricks[x][y].x+35)-this.x<this.y-(bricks[x][y].y-5)&&(bricks[x][y].x+35)-this.x<(bricks[x][y].y+20)-this.y))
						{
							if(!bonus.thru||bricks[x][y].type==2||bricks[x][y].type==21)this.xSpeed*=-1;
							if(this.x<bricks[x][y].x+15)this.x=bricks[x][y].x-5;else this.x=bricks[x][y].x+35;
						}else{
							if(!bonus.thru||bricks[x][y].type==2||bricks[x][y].type==21)this.ySpeed*=-1;
							if(this.y<bricks[x][y].y+7)this.y=bricks[x][y].y-5;else this.y=bricks[x][y].y+20;
						}
					}
				}
			}

			if(this.y>=445&&this.x<paddle.x+paddle.width&&this.x>paddle.x){
				bonus.falling();
				if(bonus.magnet==true){
					this.magnet=this.x-paddle.x;
					playAudio('Humm');
				}else playAudio('Boing');
				this.ySpeed*=-1;
				this.xSpeed=(this.x-(paddle.x+parseInt(paddle.width/2)))/30;
				this.y=445;
			}
			if(this.magnet){
				this.ySpeed = -1;
				this.xSpeed=(this.x-(paddle.x+parseInt(paddle.width/2)))/30;
				this.x = paddle.x+this.magnet;
				this.y = 445;
			}
			if(this.anim<3)this.anim+=0.2;else this.anim=0;
			this.draw();
		}
	}
	function Tbrick(x,y){
		this.aframe = 0;
		this.x = x*30+20;
		this.y = y*15+50;
		this.type = 0;
		this.imgId = [1,2,3,4,5,6,7,1,8,9,10,11,12,13,14,15,16,17,55,56,57,58,59,8,8.1,8.2,8.3,8.4,8.5,8.6,8.7,21,22,23,24,25,26,27,28]
		this.draw = function(){
			if(this.aframe)s=this.aframe;else s=this.type;
			if(this.type==7)s=0;
			if(this.x>19&&this.x<620&&this.imgId[parseInt(s)]!=1)myFonts.fillImg(this.imgId[parseInt(s)],'Mball2.sbk', this.x, this.y);
			//myFonts.strokeText(this.x+" x "+this.y, 'Sfont.sbk', this.x,  this.y+5);
			//
			//if(this.type!=0)for(y=0;y<15;y++)for(x=0;x<30;x++)if(x/2>y&&15-x/2>y||x/2<y&&15-x/2<y)ctx.fillRect(this.x+x,this.y+y,1,1);
		}
		this.bang = function(x,y){
			if(this.type!=0)this.aframe=30;
			if(this.type==8){
					this.timeout = setTimeout(function(){
					if(parseInt(Math.random()*1)==0)playAudio('Xploshor');else playAudio('Xploshor1');
					bricks[x-1][y-1].bang(x-1,y-1);
					bricks[x][y-1].bang(x,y-1);
					bricks[x+1][y-1].bang(x+1,y-1);
					bricks[x-1][y].bang(x-1,y);
					bricks[x+1][y].bang(x+1,y);
					bricks[x-1][y+1].bang(x-1,y+1);
					bricks[x][y+1].bang(x,y+1);
					bricks[x+1][y+1].bang(x+1,y+1);
				}, 80);
			}
			if(this.type!=0&&this.type!=2){user.score+=10;remains--;};
			this.type=0;
		}
		this.dell = function(x,y){
			switch(this.type){
				case 2:playAudio('Ao-laser');this.type=2;break;
				case 3:playAudio('Effect');this.type=4;user.score+=10;break;
				case 4:playAudio('Effect');this.type=5;user.score+=10;break;
				case 5:playAudio('Effect');this.type=0;remains--;user.score+=10;break;
				case 6:playAudio('Glass');for(i=0;i<6;i++){flash[nflash] = new Tflash(this.x,this.y,-4+Math.random()*8,Math.random()*6,24,10,"255,255,255");nflash++;if(nflash>=128)nflash=0;}this.type=0;remains--;user.score+=10;break;
				case 7:playAudio('Glass');for(i=0;i<6;i++){flash[nflash] = new Tflash(this.x,this.y,-4+Math.random()*8,Math.random()*6,24,10,"255,255,255");nflash++;if(nflash>=128)nflash=0;}this.type=6;user.score+=10;break;
				case 8:this.bang(x,y);break;
				case 21:playAudio('Effect');this.type=2;remains--;user.score+=10;break;
				default:playAudio('Wowpulse');this.type=0;remains--;user.score+=10;break;
			}
			if(this.type!=7&&this.type!=2&&0==parseInt(Math.random()*8))bonus.init(this.x,this.y);
		}
		this.move = function(){
			this.draw();
			if(this.aframe){
				if(this.aframe>=30)this.aframe++;if(this.aframe>36)this.aframe=0;
				if(this.type==8){
					if(this.aframe>=23&&this.aframe<30)this.aframe+=0.3;
					if(this.aframe>30){this.aframe=23;this.draw();}
				}
			}
		}
	}

	function Tbonus(x,y){
		this.thru = false;
		this.magnet = false;
		this.shooting = false;
		this.fireball = false;
		this.fall = false;
		this.shball = false;

		this.x = 0;
		this.y = 0;
		this.type = -1;
		this.xSpeed = 0;
		this.ySpeed = -2;
		this.weight = 0.1;

		this.falling=function(){
			if(this.fall){
				for(y=19;y>0;y--)for(x=0;x<20;x++)if(bricks[x][y].type==0){
					bricks[x][y].type = bricks[x][y-1].type;
					bricks[x][y].aframe = bricks[x][y-1].aframe;
					bricks[x][y-1].type=0;
				}
				playAudio('Orchblas');
			}
		}

		this.init = function(xp,yp){
			if(this.type==-1){
				playAudio('Bang');
				this.xSpeed = balls[0].xSpeed;
				this.ySpeed = -4;
				this.x = xp;
				this.y = yp;
				this.type = parseInt(Math.random()*18);
				if(this.type==14||this.type==19)this.type=13;
				for(i=0;i<8;i++){
				flash[nflash] = new Tflash(this.x,this.y,-4+Math.random()*8,-4+Math.random()*8,24,10,"255,255,255");
				nflash++;if(nflash>=128)nflash=0;
				}
			}
		}
		this.draw = function(){myFonts.fillImg(this.type+34,'Mball2.sbk', this.x, this.y);}
		this.move = function(){;
			this.x+=this.xSpeed*delta;
			this.y+=this.ySpeed*delta;
			this.ySpeed+=this.weight*delta;
			if(this.y>480)this.type=-1;
			if(this.x>=588){this.x=588;this.xSpeed*=-1;}
			if(this.x<= 20){this.x=20;this.xSpeed*=-1;}
			if(this.y>=420&&this.x<paddle.x+paddle.width+30&&this.x>paddle.x-30&&this.type>=0){
				user.score+=100;
				switch(this.type){
					case  0:playAudio('Fanfare');user.lives++;break
					case  1:playAudio('Peow!');cl=true;setTimeout(function(){user.level++;createlevel(user.level);}, 200);break
					case  2:playAudio('Peow!');for(y=0;y<20;y++)for(x=0;x<20;x++){if(bricks[x][y].type==2){bricks[x][y].type=20;remains++}if(bricks[x][y].type==7)bricks[x][y].type=6;}break
					case  3:playAudio('Peow!');for(i=0;i<balls.length;i++){balls[i].xSpeed/=2;balls[i].ySpeed/=2};break
					case  4:playAudio('Peow!');multiExp();break
					case  5:playAudio('Peow!');this.thru = true;break
					case  6:playAudio('Peow!');for(y=0;y<20;y++)for(x=0;x<20;x++)if(bricks[x][y].type==8)bricks[x][y].bang(x,y);break
					case  7:playAudio('Peow!');this.fireball = true;break
					case  8:playAudio('Peow!');this.shooting = true;break
					case  9:playAudio('Peow!');this.magnet = true;break
					case 10:playAudio('Effect2');if(paddle.size<4)paddle.size++;break
					case 11:playAudio('Effect2');if(paddle.size>0)paddle.size--;break
					case 12:playAudio('Peow!');a=balls.length;for(i=0;i<a;i++){t=balls.length;if(balls[i].is){balls[t] = new Tball(); balls[t] = new Tball(); balls[t].x=balls[i].x;balls[t].y=balls[i].y;balls[t].xSpeed=balls[i].xSpeed;balls[t].ySpeed=balls[i].ySpeed+0.2;balls[i].xSpeed-=0.2; balls[t].ySpeed/=1.2; balls[i].ySpeed/=1.2;}};break
					case 13:death(true);break
					case 14:/*??????*/;break
					case 15:playAudio('Peow!');for(i=0;i<balls.length;i++){balls[i].xSpeed*=2;balls[i].ySpeed*=2};break
					case 16:playAudio('Sweepdow');paddle.size=0;break
					case 17:playAudio('Peow!');this.fall = true;break
					case 18:playAudio('Peow!');this.shball = true; this.fireball = false;break
					case 19:/*??????*/;break
				}
				this.type=-1
			}
		this.draw();
		}
	}

	function Tpaddle(){
		this.x = 300;
		this.type = 0;
		this.anim = 0;
		this.sizes = [36, 73, 146, 218, 292];
		this.size = 1;
		this.draw = function(){
			vm=false; for(i=0;i<balls.length;i++)if(balls[i].magnet)vm=true;

			if(bonus.shooting){
				if(vm){
					myFonts.fillImg(123+(this.size*4)+parseInt(this.anim),'Mball2.sbk', this.x, 435);
				}
					myFonts.fillImg(103+(this.size*4)+parseInt(this.anim),'Mball2.sbk', this.x, 435);
			}else{
				if(vm){
					myFonts.fillImg(123+(this.size*4)+parseInt(this.anim),'Mball2.sbk', this.x, 440);
					myFonts.fillImg(83+(this.size*4)+parseInt(this.anim),'Mball2.sbk', this.x, 440);
				}else
					myFonts.fillImg(63+(this.size*4)+parseInt(this.anim),'Mball2.sbk', this.x, 450);

			}

		}
		this.move = function(){
			this.width = this.sizes[this.size];
			//this.x = parseInt((mouse.x-this.width/2)/(window.innerWidth/640));
			//if(canvas.style.width==window.screen.width) this.x = parseInt(mouse.x-this.width/2);
			this.x = parseInt(((mouse.x-getOffsetSum(canvas).left)-this.width/2)/(canvas.offsetWidth/640));
			if(this.x<20)this.x=20;
			if(this.x>620-this.width)this.x=620-this.width;
			this.anim+=0.2;if(this.anim>4)this.anim=0;
			this.draw();
		}
	}

	function Tbullet(){
		this.x=0;
		this.y=435;
		this.is = true;
		this.ySpeed=-10;
		this.draw = function(){myFonts.fillImg(31,'Mball2.sbk', this.x, this.y);}
		this.move = function(){
			if(this.is){
				if(this.y>45&&this.y<345&&this.x>20&&this.x<620){
					for(y=parseInt((this.y-45)/15)-1;y<parseInt((this.y-45)/15)+1;y++)for(x=parseInt((this.x-20)/30)-1;x<parseInt((this.x-20)/30)+1;x++){
						if(bricks[x][y].type!=0&&this.x>bricks[x][y].x-5&&this.x<bricks[x][y].x+35&&this.y>bricks[x][y].y-5&&this.y<bricks[x][y].y+20){
									bricks[x][y].dell(x,y);
									this.is=false;
						}
					}
				}
				this.y+=this.ySpeed;
				if(this.is)this.draw();
			}
		}
	}

	function Tlightning(){
		this.drawing = false;
		this.x = this.y = 0;
		this.volume = 0;
		this.is = false;
		this.timout = false;
		this.set = function(x,y){
			this.x = x;
			this.y = y;
			this.is = true;
			this.timout = setTimeout(function(){
				lightning.show();
			},30000);
			this.volume = 0;
			audioFile['Voltage'].play();
		}
		this.show = function(){
			bricks[this.x][this.y].type = 8;
			bricks[this.x][this.y].bang(this.x,this.y);
			playAudio('Thudclap');
			this.drawing = true;
			setTimeout(function(){
				lightning.drawing = false;
				lightning.is = false;
				audioFile['Voltage'].pause();
			},40);
		}
		this.draw = function(){
			if(this.drawing)ctx.drawImage(bigbolt_img, this.x*30+20-65, this.y*15+50-475);
		}
			//ctx.drawImage(bigbolt_img, x*30+20-65,y*15+50-480);
		//this.bang(x,y);
	}
	lightning = new Tlightning();


	function Tflash(x,y,xSpeed,ySpeed, live, noize,color){
		this.x = x+(-noize/2+parseInt(Math.random()*noize));
		this.y = y+(-noize/2+parseInt(Math.random()*noize));;
		this.xSpeed = xSpeed;
		this.ySpeed = ySpeed;
		this.live = live;
		color = color;
		this.is = true;
		this.draw = function(){
			ctx.fillStyle = "rgba("+color+","+this.live/24+")";
			ctx.fillRect(parseInt(this.x), parseInt(this.y), 2, 2)
		}
		this.move = function(){
			if(this.is){
				this.live--;
				if(this.live<=0)this.is=false;
				this.x += this.xSpeed;
				this.y += this.ySpeed;
				this.draw();
			}
		}
	}

	function Tbang(x,y){
		this.x = x;
		this.y = y;
		this.aframe=0;
		this.is = true;
		for(i=0;i<8;i++){
			flash[nflash] = new Tflash(this.x,this.y,-4+Math.random()*8,-4+Math.random()*8,24,10,"255,255,255");
			nflash++;if(nflash>=128)nflash=0;
		}
		this.draw = function(){
			myFonts.fillImg(143+this.aframe,'Mball2.sbk', this.x-21, this.y-21);
		}
		this.move = function(){
			if(this.is){
				if(this.aframe<22)this.aframe++;else this.is=false;
				this.draw();
			}
		}
	}
	function Tshadow(){
		this.drawing = false;
		this.aframe = 0;
		this.draw = function(){
			if(this.aframe<20){
				var imgd = ctx.getImageData(0, 0, 640, 480);
				var pix = imgd.data;
				for (i= 0, n = pix.length; i <n; i += 4) {
					var grayscale = pix[i] * .3 + pix[i+1] * .59 + pix[i+2] * .11;
					pix[i] =   (pix[i]+grayscale/5)/1.2;
					pix[i+1] = (pix[i+1]+grayscale/5)/1.2;
					pix[i+2] = (pix[i+2]+grayscale/5)/1.2;
				}
				ctx.putImageData(imgd, 0, 0);
			}else if(this.aframe>=20&&this.aframe<70){
				ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
				ctx.fillRect(0, 0, 640, 480);
			}else if(this.aframe>=70&&this.aframe<100){
				if(this.aframe==70)paused=paus;
				if(user.lives>0){
					ctx.drawImage(mbbkgrnd_img,0,0);
					for(y=0;y<20;y++)for(x=0;x<20;x++)bricks[x][y].move();
					if(paused)myFonts.strokeText('PAUSED','Thefont.sbk',237,210);
					setscore(user.score);
				}else{
					highscore.draw();
					highscore.drawing = 1;
				}
				ctx.fillStyle = "rgba(0, 0, 0, "+(1-(this.aframe-70)*.033)+")";
				ctx.fillRect(0, 0, 640, 480);
			}else if(this.aframe>=100){this.drawing=false;this.aframe=0;}
			this.aframe++;
		}
	}
	shadow = new Tshadow;

	chcur='_';setInterval(function(){if(chcur=='_')chcur=' ';else chcur='_';},500)

	function Thighscore(){
		this.loading = false;
		this.upLim = this.downLim = -1;
		this.drawing = 0;
		this.aframe = 0;
		this.draw = function(){
			ctx.drawImage(Highscor_img,0,0);
			if(this.drawing == 1){
				myFonts.strokeText("Your score:", 'Sysfont.sbk', 272,160);
				sc=user.score+'';
				myFonts.strokeText(user.score, 'Sysfont.sbk', 316-(sc.length-2)*9,191);
				myFonts.strokeText('Enter your name:', 'Sysfont.sbk', 70,220);
				myFonts.strokeText(user.name+chcur, 'Sysfont.sbk', 70,250);
			}else if(this.drawing == 2){
				for(j=0;j<15;j++){
					myFonts.strokeText(records[scrollPos+j].name, 'Sysfont.sbk', 10 ,160+(j*20));
					myFonts.strokeText(records[scrollPos+j].score, 'Sysfont.sbk', 570,160+(j*20));
					myFonts.strokeText(scrollPos+j, 'Sysfont.sbk', 500,160+(j*20));
					if(scrollPos+j==this.selection){ctx.strokeStyle = "rgba(255,0,255,"+(0.7+Math.sin(this.aframe/8)/4)+")";ctx.strokeRect(5,158+(j*20),630,20);this.aframe++}
				}
			}
		}
	}
	highscore = new Thighscore;



	function Tsaver(){
		this.aframe=0;
		this.drawing = 1;
		this.sinString = "WELCOME TO DX-BALL.     GREETINGS GO OUT TO:  ED + AL MACKEY, SIMEON, LARRY, MIKE BOEH, DARK UNICORN PRODUCTIONS (SHANE, JOHN, SEUMAS, ERIC (SIDEWINDER), REMEMBER KIT...), AND THE 'MAD TESTER' CHAY-BOB.     LAST MINUTE SUPER THANKS GOES TO SHANE MONROE FOR THE DX-BALL WEB PAGE.    IT ROCKS!     THIS PROJECT WAS MANY LONG MONTHS IN THE MAKING.    LATE NIGHTS, LOTS OF MOUNTAIN DEW, AND MANY PROGRAMMING BOOKS GOT THIS, MY FIRST DIRECT X AND PC GAME, FINISHED FOR YOUR VIEWING PLEASURE.      ABOUT THE GAME: I KNOW 'BREAKOUT' GAMES HAVE BEEN DONE TO DEATH, BUT I HAVEN'T FOUND ONE YET THAT'S AS COMPELLING AS MEGABALL FOR THE AMIGA COMPUTER.    SINCE MEGABALL IS MY WIFE'S FAVORITE GAME, I THOUGHT I'D MAKE HER A VERSION THAT SHE CAN PLAY ON MY PENTIUM 60.  :)      BY THE WAY, DX-BALL IS MEANT TO BE AN AMIGA GAME TRAPPED IN A PC'S BODY.   (SMILE)    ALSO GOT SOME RETRO COMMODORE 64 MIXED IN HERE AND THERE...  IF ONLY I HAD A DIRECT SOUND 'MOD' PLAYER, THEN EVERYTHING WOULD BE PERFECT!      ABOUT THE AUTHOR: HI I'M MIKE, BUT SOME CALL ME 'SCORCH.'    I'M THAT KID WHO WROTE THE AMIGA GAME 'SCORCHED TANKS.'    I KNOW, I KNOW, ALL YOU PC PEOPLE ARE SAYING 'NO STUPID, THAT'S SCORCHED EARTH!'    WELL, 'S-TANKS' WAS THE AMIGA ANSWER TO 'EARTH.'    THE WHOLE SCORCH PROJECT WAS VERY EXCELLENT AND THE RESPONSE FROM MY FELLOW AMI FANS WAS INCREDIBLE.    CERTAINLY, '94 WAS THE BEGINNING OF THE REST OF MY LIFE, AND I MUST SAY THANKS TO MY FRIENDS ALL OVER THE WORLD.        HEY, IF YOU'RE STILL READING THIS SCROLLER, THEN MORE POWER TO YA!   LET'S TALK ABOUT CODE...   DX-BALL WAS WRITTEN TO BE COMPATIBLE WITH EVERY POSSIBLE PC THAT CAN INSTALL DIRECT X 2.    I BOUGHT 4 VIDEO CARDS ON MY OWN AND BORROWED 2 VIDEO CARDS FROM MY GOOD FRIEND MIKE BOEH.    I TOOK DX-BALL TO WORK, NEIGHBOR'S HOUSE, FATHER-IN-LAW'S HOUSE, BROTHER-IN-LAW'S HOUSE, AND EVEN HAD IT TESTED WITH WINDOWS NT AS SOON AS THE NEW RELEASE SUPPORTED DIRECT X.    I EVEN ASKED/FORCED MY FRIENDS TO TAKE IT HOME AND TRY IT ON THEIR PC'S.  :O  MAN I FOUND A LOT OF BUGS IN THE GAME, AND LOTS OF QUIRKS IN DIRECT X.    I HOPE I GOT THEM ALL, BUT IF I DIDN'T, I KNOW I CAN COUNT ON 'YOU' TO SEND ME AN E-MAIL.    SO I FOUND OUT TWO IMPORTANT THINGS FROM MY EXPERIMENTS.    FIRST OF ALL, DIRECT X'S HARDWARE ACCELERATION IS VERY COOL.    SECOND, I LEARNED THAT NOT EVERY VIDEO CARD SUPPORTS IT.    FOR INSTANCE, VIDEO CARDS WITH: S3, MACH32/64, MATROX, TSENG, AND OTHERS WITH HARDWARE SUPPORT CAN SPEED-UP GRAPHICS 'BLITTING' BY AT LEAST 3X IF DONE PROPERLY.    BUT THERE ARE VERY COMMON VIDEO CARDS WITH TRIDENT OR ARK CHIPSETS THAT HAVE NO SUPPORT.    THEY WILL RUN DIRECT X GAMES, BUT THE EMULATION MODE CAN SLOW IT WAY DOWN.    UNTIL THE DAY THAT EVERYONE GETS A NEW COMPUTER OR VIDEO CARD, DIRECT X WILL NOT REACH IT'S FULL POTENTIAL.    BUT FOR NOW, US PROGRAMMERS WILL WORK OUR BRAINS OUT TO GIVE EVERYONE A CHANCE TO PLAY OUR GAMES.    DX-BALL RUNS ON ALL VIDEO CARDS, EITHER IN THE BLAZING FAST MODE, OR IN THE 'COMPATIBILITY' MODE THAT KEEPS UP WITH THE 60 FPS STANDARD.    I ONLY ASK THAT IF YOUR SYSTEM HAS A VERY HIGH REFRESH RATE... THEN MAYBE YOU OUGHT TO LOWER IT FOR THE SAKE OF PLAYING DX-BALL AT A NORMAL SPEED.  :)    WELL, I'VE TALKED ABOUT EVERYTHING NOW AND IT'S TIME TO WRAP-UP THIS EXTRA LONG SCROLLER.    THANKS FOR READING, AND ENJOY THE GAME.                                                 MADE YOU LOOK!  HEHEHEHEHEHE                                                                  ";
		this.mballs = [
		'.........................................',
		'.###...#...#.....####....#...#.....#.....',
		'.#..#...#.#......#...#..#.#..#.....#.....',
		'.#...#...#...###.#..#..#...#.#.....#.....',
		'.#..#...#.#......#...#.#####.#.....#.....',
		'.###...#...#.....####..#...#.#####.#####.',
		'.........................................',
		]
		this.ss = 0;

		this.draw = function(){
			if(this.drawing == 1){
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = "rgba(255, 0, 0, 1)";
				ctx.fillRect(0,277+parseInt(Math.sin(this.ss/90)*118),640,10);
				ctx.fillStyle = "rgba(0, 0, 255, 1)";
				ctx.fillRect(0,277-parseInt(Math.sin(this.ss/90)*118),640,10);
				ctx.globalCompositeOperation = 'source-over';
				ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
				ctx.fillRect(0,0,640,480);


				ctx.drawImage(Intro_img,0,0,640,160,0,0,640,160);
				ctx.drawImage(Intro_img,0,337,640,14,0,  6,640,14);
				ctx.drawImage(Intro_img,0,364,640,14,0,128,640,14);

				myFonts.strokeText('VIDEO CARD:','Candy.sbk',20,174);myFonts.strokeText('REFRESH RATE ABOVE 60 MHZ','Candy.sbk',180,174);
				myFonts.strokeText('DEFAULT TO >COMPATIBLE\< MODE','Candy.sbk',210,194);
				myFonts.strokeText('AUTHOR:','Candy.sbk',20,229);myFonts.strokeText('MICHAEL P. WELCH','Candy.sbk',180,229);
				myFonts.strokeText('3D GFX:','Candy.sbk',20,249);myFonts.strokeText('SEUMAS McNALLY','Candy.sbk',180,249);
				myFonts.strokeText('E-MAIL:','Candy.sbk',20,284);myFonts.strokeText('MWELCH1@STNY.LRUN.COM','Candy.sbk',180,284);
				myFonts.strokeText('VISIT   HTTP://HOME.STNY.LRUN.COM/SCORCHED/','Candy.sbk',42,314);
				myFonts.strokeText('FOR FREE BOARD EDITOR PLUS HINTS AND TIPS','Candy.sbk',53,334);

				this.sx = 640;
				this.sy = 422;
				ctx.fillStyle = "#000";
				ctx.fillRect(0,401,640,79);

				for(i=0;i<this.sinString.length;i++){
					for(j=0;j<=myFonts.font['Chisel2.sbk'].char[this.sinString[i]].width;j++){
						if((this.sx-this.ss)>40&&(this.sx-this.ss)<600){
							//ctx.drawImage(Chisel2_img, fonts[this.sinString[i]][2][0]+j, 0, 1, 33, this.sx-this.ss, this.sy, 1, 33);
							height = myFonts.font['Chisel2.sbk'].char[this.sinString[i]].height;
							y = myFonts.font['Chisel2.sbk'].char[this.sinString[i]].y;
							ctx.drawImage(myFonts.font['Chisel2.sbk'].char[this.sinString[i]].img, j, 0, 1, height, this.sx-this.ss, this.sy+y, 1, height);
							//alert(myFonts.font['Chisel2.sbk'].space);
						}
						this.sx++;
						this.sy = 422+parseInt(Math.sin((this.sx-this.ss)/55)*19);
					}
				}
				this.ss+=6;
			}else if(this.drawing == 2){
				ctx.drawImage(Mainmenu_img,0,0,640,480);
				ctx.fillStyle = "#cb00cb";

				for(y=0;y<7;y++){
					for(x=0;x<=40;x++){
						xp = parseInt((115+10*x)+Math.sin(this.ss+x/4+y/3)*2);
						yp =  parseInt((40+10*y)+Math.cos(this.ss+x/4+y/3)*2);
						if(this.mballs[y][x]=='.')ctx.fillRect(xp,yp,1,1);else myFonts.fillImg(0,'Mball2.sbk', xp-3, yp-3);
					}
				}
				myFonts.strokeText("BASED ON  ``MEGABALL``", 'Thefont.sbk', 63,180);
				myFonts.strokeText("BY ED AND AL MACKEY", 'Thefont.sbk', 77,220);
				myFonts.strokeText("By Michael P. Welch", 'Sfont.sbk', 485,124);

				myFonts.strokeText("V 1.09", 'Sfont.sbk', 615,  4);
				myFonts.strokeText("Copyright  1996-98  by Michael P. Welch,  All Rights Reserved.", 'Sfont.sbk', 3,459);
				myFonts.strokeText("You may freely distribute this game so long as it's not sold for profit without the author's written consent.", 'Sfont.sbk', 3,469);

				this.ss+=.1;
				ctx.drawImage(sphere_img, 135*this.aframe, 0, 135, 135, 499 ,319 , 135, 135);
				this.aframe++;if(this.aframe==14)this.aframe=0;
			}
		}
	}
	saver = new Tsaver;

	for(y=-1;y<21;y++){
		bricks[y] = new Array();
		for(x=-1;x<21;x++){
			bricks[y][x] = new Tbrick(y,x);
		}
	}

	function multiExp(){
		for(y=0;y<20;y++)for(x=0;x<20;x++){
			if(bricks[x][y].type==8){
				bricks[x-1][y].type=bricks[x+1][y].type=bricks[x][y-1].type=bricks[x][y+1].type=-1;
				bricks[x-1][y].aframe=bricks[x+1][y].aframe=bricks[x][y-1].aframe=bricks[x][y+1].aframe=bricks[x][y].aframe;
			}
		}
		for(y=0;y<20;y++)for(x=0;x<20;x++)if(bricks[x][y].type==-1)bricks[x][y].type=8;
	}

	function startGame(){
		user.score=0
		user.level=1;
		user.lives=3;
		user.timeGame = 0;
		createlevel(user.level);
		user.startTime = (new Date()).getTime();
		setTimeout(function(){
			getDelta();
		},3000);
	}

	function createlevel(n){
		setPaddle();
		cl=false;
		shadow.aframe = 20;
		clearTimeout(lightning.timout);
		audioFile['Voltage'].pause();
		shadow.drawing = true;
		remains = 0;
		for(y=0;y<20;y++){
			for(x=0;x<20;x++){
				clearTimeout(bricks[x][y].timeout);
				bricks[x][y].type = file.charCodeAt((y*20+x)+(400*(n-1)));
				bricks[x][y].aframe=0;
				if(bricks[x][y].type!=0&&bricks[x][y].type!=2)remains++;
				if(bricks[x][y].type==8)bricks[x][y].aframe=23;
			}
		}
	}

	function setPaddle(){
		bonus.thru = bonus.magnet = bonus.shooting = bonus.fireball = bonus.fall = bonus.shball = false;
		balls.length = 1;
		bullets.length = 0;
		balls[0].y = 460;
		balls[0].is = true;
		balls[0].magnet = 40;
		paddle.size = 1;
		bonus.type = -1;
	}

	function death(p){
		nb=0;
		for(i=0;i<balls.length;i++){
			if(balls[i].is==true)nb++;
		}
		//alert(nb);

		if(nb<=0||p){
			playAudio('Padexplo');
			shadow.drawing = true;
			user.lives--;
			setPaddle();
		}else{
			playAudio('Xplosht1');
		}
		if(user.lives==0){
			user.timeGame = (new Date()).getTime() - user.startTime;
		}
	}

	mouse = new Object;
	mouse.x = mouse.y = 320;
	canvas.onmousemove = function(e){
		if (!e){e=window.event};
		mouse.x = e.pageX;
		mouse.y = e.pageY;
	}
	canvas.addEventListener('touchmove', function(e) {
		mouse.x = e.touches[0].pageX;
		mouse.y = e.touches[0].pageX;
	})

	canvas.onmousedown = function(){
		if(paus){
			shadow.aframe = 20;
			shadow.drawing = true;
			paus = !paus;
		}
		if(saver.drawing==1){
			saver.drawing=2
			audioFile['Whine'].pause();
			music_N=0;
			if(window.soundon)music.play();
			//saver.drawing = 0;
			//shadow.aframe = 20;
			//shadow.drawing = true;
		}else if(saver.drawing==2){
			saver.drawing=0;
			createlevel(user.level);
			startGame();
		}else if(!shadow.drawing&&!highscore.drawing&&!saver.drawing&&!paused){
				for(i=0;i<balls.length;i++){balls[i].magnet=false;}
				if(bonus.shooting){
					playAudio('Gunfire');
					i=bullets.length;
					bullets[i] = new Tbullet();bullets[i].x = paddle.x+3;
					bullets[i+1] = new Tbullet;bullets[i+1].x = paddle.x+paddle.width;
				}
		}else if(highscore.drawing==2){
			highscore.drawing=false;
			saver.drawing=2;
		}
	};

	window.onblur = function(){
		if(saver.drawing == 0&&!highscore.drawing){
			shadow.aframe = 20;
			shadow.drawing = true;
			paus = true;
		}

	}


	document.onkeydown = function(event){
		if(!highscore.loading){
			//alert(highscore.upLim+"  "+highscore.downLim)

			if(event.keyCode==38){
				window.scroll(0,0);
				if(highscore.drawing==2){
					highscore.aframe = 0;
					if(highscore.selection-1>=highscore.upLim)highscore.selection--;
					else if(highscore.selection<15)loadScore(1);else loadScore(highscore.selection-15);
				}
			}
			if(event.keyCode==40){
				window.scroll(0,0);
				if(highscore.drawing==2){
					highscore.aframe = 0;
					if(highscore.selection+3<=highscore.downLim)highscore.selection++;
					else loadScore(highscore.selection);
				}
			}
			if(event.keyCode==80&&saver.drawing == 0&&!highscore.drawing){
				shadow.aframe = 20;
				shadow.drawing = true;
				if(!paus){
					pauseTime = (new Date()).getTime();
				}else{
					user.startTime+=((new Date()).getTime() - pauseTime);
				}
				paus = !paus;
			}
			if(event.keyCode==27&&saver.drawing == 0&&!highscore.drawing){
				highscore.drawing=false;
				saver.drawing=2;
			}
			if(event.keyCode==83&&!highscore.drawing==1){
				soundon=!soundon;
				if(!soundon){
					music.pause();
					for(i=0;i<64;i++)audio[i].pause();
				}else{
					music.play();
				}
			}

			if(highscore.selection<scrollPos)scrollPos=highscore.selection;
			if(highscore.selection>=scrollPos+15)scrollPos=highscore.selection-14;

			//if(event.keyCode==40&&highscore.selection>0)highscore.selection++;
			//if(event.keyCode==38)highscore.selection--;

			//if(highscore.selection>=scrollPos+15)scrollPos=highscore.selection-14;
			//if(highscore.selection<highscore.upLim)loadScore(highscore.selection-15);
		}

		if(highscore.drawing==1){
			ch='';
			if(user.name.length<30){
				if(event.keyCode>=48&&event.keyCode<=57)ch=event.keyCode-48;
				if(event.keyCode>=65&&event.keyCode<=90){
					ch=String.fromCharCode(event.keyCode)
					if(!event.shiftKey)ch=ch.toLowerCase();
				}
				if(event.keyCode==32)ch=' ';
				user.name+=ch;
			}
			if(event.keyCode==8){user.name=user.name.slice(0, -1);return false}
			if(event.keyCode==13){
				if(user.name&&user.name[0]!=' ')loadScore('f');
			}
		}
	}

	setInterval(function(){
		if(music.currentTime>=music.duration-1){
			music_N++;if(music_N==6)music_N=0;
			music.pause();
			music = audioFile[audioName[music_N]].cloneNode(true);
			music.play();
		}
	},100);


	function loadScore(type){
		highscore.loading = true;
		if(type<1)type=0;

		let localRecords = window.dxBallHighScores || [];
		if(type=='f') {
			localRecords.push({name: user.name, score: user.score});
			localRecords.sort((a, b) => b.score - a.score);
			localRecords = localRecords.slice(0, 100);
			window.dxBallHighScores = localRecords;

			window.parent.postMessage({
				type: 'DXBALL_SAVE_SCORE',
				name: user.name,
				score: user.score
			}, '*');

			let rank = -1;
			for(let i=0; i<localRecords.length; i++) {
				if(localRecords[i].name === user.name && localRecords[i].score === user.score) {
					rank = i;
					break;
				}
			}
			if (rank === -1) rank = 0;

			let response = "";
			for(let i=0; i<Math.max(15, localRecords.length); i++) {
				let name = localRecords[i] ? localRecords[i].name : "---";
				let score = localRecords[i] ? localRecords[i].score : "0";
				response += i + "&" + name + "&" + score + "\r";
			}
			response += rank;
			rec = response;
		} else {
			let response = "";
			for(let i=0; i<Math.max(15, localRecords.length); i++) {
				let name = localRecords[i] ? localRecords[i].name : "---";
				let score = localRecords[i] ? localRecords[i].score : "0";
				response += i + "&" + name + "&" + score + "\r";
			}
			response += "0";
			rec = response;
		}

		rec = rec.split("\r");
		for(i=0;i<rec.length-1;i++){
			str = rec[i];
			str = str.split("&");
			if(i==0){
				//alert(highscore.upLim+">"+parseInt(str[0])+"?")
				if(highscore.upLim>parseInt(str[0])||highscore.upLim==-1)highscore.upLim = parseInt(str[0]);
				if(highscore.downLim<parseInt(str[0])+rec.length||highscore.downLim==-1)highscore.downLim = parseInt(str[0])+rec.length;
				if(type=='f')scrollPos = parseInt(str[0]);
			}
			records[parseInt(str[0])] = new Object();
			records[parseInt(str[0])].name  = str[1];
			records[parseInt(str[0])].score = str[2];

		}
		if(type=='f')highscore.selection = parseInt(rec[rec.length-1]);
		highscore.drawing=2;
		highscore.loading = false;
	}

	//==========================[ACTION]=========================
	balls[balls.length] = new Tball();
	paddle = new Tpaddle();
	bonus = new Tbonus();


	window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback,element){window.setTimeout(callback, 1000 / 10)};
    })();

	var fps = 50;
	var nframe = 0;
	setInterval(function(){
		fps = parseInt(nframe);
		//delta = 1000/fps/60;
		nframe = 0;
	},1000);

	function getDelta(){
		realframe = 0;
		setTimeout(function(){
			if(!shadow.drawing&&!highscore.drawing&&!saver.drawing&&!saver.drawing&&!paused){
				delta = 60/realframe;
			}else setTimeout(function(){getDelta()},2000);
		},1000);
	}

	ctx.fillStyle = "#000";ctx.fillRect(0,0,640,480);
	if(!window.saveron){
		saver.drawing=false;
		audioFile['Whine'].pause();
		if(window.soundon){
			music_N=0;
			music.play();
		}
		startGame();
	}

    function frame(){
		if(!shadow.drawing&&!highscore.drawing&&!saver.drawing&&!saver.drawing&&!paused){
			ctx.drawImage(mbbkgrnd_img,0,0);
			paddle.move();
			for(y=0;y<20;y++)for(x=0;x<20;x++)bricks[x][y].move();
			for(i=0;i<bullets.length;i++)bullets[i].move();
			for(i=0;i<bang.length;i++)bang[i].move();
			for(i=0;i<flash.length;i++)flash[i].move();
			if(bonus.type!=-1)bonus.move();
			for(i=0;i<balls.length;i++)if(balls[i].is)balls[i].move();
			lightning.draw();
			setscore(user.score);

			//if(remains==1&&!lightning.is)for(y=0;y<20;y++)for(x=0;x<20;x++)if(bricks[x][y].type!=0)lightning.set(x,y);
		}
		if(!shadow.drawing&&paused){
			ctx.drawImage(mbbkgrnd_img,0,0);
			for(y=0;y<20;y++)for(x=0;x<20;x++)bricks[x][y].move();
			setscore(user.score);
			myFonts.strokeText('PAUSED','Thefont.sbk',237,210);
		}
		animframe+=0.1;if(animframe>0.8)animframe=0;
		if(saver.drawing)saver.draw();
		if(highscore.drawing)highscore.draw();
		if(shadow.drawing)shadow.draw();
		//myFonts.strokeText("COF: "+cof.toFixed(2), 'Sfont.sbk', 480,  468);
		//myFonts.strokeText("DELTA: "+delta.toFixed(2), 'Sfont.sbk', 530,  468);
		myFonts.strokeText("FPS: "+fps, 'Sfont.sbk', 585,  468);
		if(remains<=0&&!cl){cl=true;setTimeout(function(){user.level++;createlevel(user.level);}, 200)};
		nframe++;
		realframe++
		requestAnimFrame(frame);
    }frame();
}


var hex_chr = "0123456789abcdef";
function rhex(num)
{
  str = "";
  for(j = 0; j <= 3; j++)
    str += hex_chr.charAt((num >> (j * 8 + 4)) & 0x0F) +
           hex_chr.charAt((num >> (j * 8)) & 0x0F);
  return str;
}
function str2blks_MD5(str)
{
  nblk = ((str.length + 8) >> 6) + 1;
  blks = new Array(nblk * 16);
  for(i = 0; i < nblk * 16; i++) blks[i] = 0;
  for(i = 0; i < str.length; i++)
    blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  blks[i >> 2] |= 0x80 << ((i % 4) * 8);
  blks[nblk * 16 - 2] = str.length * 8;
  return blks;
}
function add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

function rol(num, cnt){return (num << cnt) | (num >>> (32 - cnt));}
function cmn(q, a, b, x, s, t){return add(rol(add(add(a, q), add(x, t)), s), b);}
function ff(a, b, c, d, x, s, t){return cmn((b & c) | ((~b) & d), a, b, x, s, t);}
function gg(a, b, c, d, x, s, t){return cmn((b & d) | (c & (~d)), a, b, x, s, t);}
function hh(a, b, c, d, x, s, t){return cmn(b ^ c ^ d, a, b, x, s, t);}
function ii(a, b, c, d, x, s, t){return cmn(c ^ (b | (~d)), a, b, x, s, t);}
function calcMD5(str)
{
  x = str2blks_MD5(str);
  a =  1732584193;
  b = -271733879;
  c = -1732584194;
  d =  271733878;

  for(i = 0; i < x.length; i += 16)
  {
    olda = a;
    oldb = b;
    oldc = c;
    oldd = d;

    a = ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i+10], 17, -42063);
    b = ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = ff(d, a, b, c, x[i+13], 12, -40341101);
    c = ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = gg(c, d, a, b, x[i+11], 14,  643717713);
    b = gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = gg(c, d, a, b, x[i+15], 14, -660478335);
    b = gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = hh(b, c, d, a, x[i+14], 23, -35309556);
    a = hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = hh(d, a, b, c, x[i+12], 11, -421815835);
    c = hh(c, d, a, b, x[i+15], 16,  530742520);
    b = hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i+10], 15, -1051523);
    b = ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = ii(d, a, b, c, x[i+15], 10, -30611744);
    c = ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = add(a, olda);
    b = add(b, oldb);
    c = add(c, oldc);
    d = add(d, oldd);
  }
  return rhex(a) + rhex(b) + rhex(c) + rhex(d);
}

function getOffsetSum(elem) {
    var top=0, left=0
    while(elem) {
        top = top + parseFloat(elem.offsetTop)
        left = left + parseFloat(elem.offsetLeft)
        elem = elem.offsetParent
    }
    return {top: Math.round(top), left: Math.round(left)}
}
