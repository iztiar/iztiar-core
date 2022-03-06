/*
 * LogLevel class
 */

export class LogLevel {

    _level = 0;
    _label = null;
    _color = null;

    /**
     * Constructor
     * @param {Integer} level the level value
     * @param {String} label the level label, will be forced to lower case
     * @param {Object} color the chalk color object instance
     * @returns 
     */
    constructor( level, label, color=null ){
        this._level = level;
        this._label = label.toLowerCase();
        this._color = color;
        return this;
    }

    color(){
        return this._color;
    }

    label(){
        return this._label;
    }

    level(){
        return this._level;
    }
}
