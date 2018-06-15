"use strict"
const MAXLEN=2000;
class Queue {
    constructor() {
        this.filelist=[];
        this.top=0;
    }
    Push(path){
        this.filelist.push(path);
    }
    Pop() {
        if (this.top < this.filelist.length) {
            if (this.top > 32) {
                this.filelist=this.filelist.splice(this.top,this.filelist.length-this.top);
                this.top=0;
            }
            this.top+=1;
            return this.filelist[this.top-1]
        } else {
            return null;
        }
        this.Shuff();
    }
    Length(){
        return (this.filelist.length-this.top);
    }
    Shuff(){
        //队列push频率高，pop频率低
        if ((this.filelist.length-this.top) > MAXLEN) {
            this.filelist=this.filelist.splice(this.top,MAXLEN-700);
            this.top=0;
        }
    }
}

module.exports=new Queue();