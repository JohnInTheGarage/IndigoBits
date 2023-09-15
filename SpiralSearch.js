/*
* Spiral search pattern for Indigo.
*
* Developed because I find my mount often does not GOTO the exact location for planets
* when working at full focal length (2700mm) with my ASI224MC, which has a very small field of view.
* I assume its due to calculation accuracy as the mount GOTO works fine for DSO & Stellar targetting.
* Anyway...
*
* When running this script, the main assumption is that a GOTO has just been performed,
* so there is no check for current location.  The search just spirals outwards from
* wherever it finds itself; based on a reduced field of view.  The reduction is to
* try to eliminate gaps that would occur if your camera's orientation is not aligned
* with equatorial axes (therefore also assumes you are using an equatorial mount!).
*
* An image is taken at each point in the search pattern and so when it stops searching
* (after 3 loops by default, giving a box 7x8 in size) then you can look at each image
* to see if the target was found.
* The image FITS header will give you the coordinates to do another GOTO to locate
* the target from items SrchRA and SrchDec.
*
* Script provided for use at your own risk, please test it first with the Mount Simulator
* before using with a real mount (you might want to change the default CCD simulator
* focal length for more realistic movements).
*
* John Knight Sept 2023
*
* 2023-09-15 Updated to expand the search box and reduce exposure time a little, plus
*            fix the bug where changes in RA were made with units of degrees instead of hours.
*/

"use strict"
// change these if needed
var reductionFactor = 0.8;
var imagePath = "/home/john/ain_data/"
var debugging = false;

// Should be no need to change these variables that follow
var mount = indigo_devices["Mount Agent"];
var imager = indigo_devices["Imager Agent"];
var moving = false;
var imaging = false;
var ix = 0;

/*
 * Wait for the mount to stop moving, then take an image and save it.
*/
indigo_event_handlers.SLEW_handler = { devices: ["Mount Agent"],

    on_update: function(property) {
       if (property.name.toUpperCase() === "MOUNT_EQUATORIAL_COORDINATES" && moving) {
           if (property.state.toUpperCase() === "BUSY") {
               // Moving to next point in pattern
           } else {
               if (property.state.toUpperCase() == "OK") {
                   moving = false;
                   imaging = false;
                   imager.CCD_EXPOSURE.change ({EXPOSURE: 0.75 });
               }
           }
       }
    }
};


/*
 * Wait for the exposure to complete, then go to the next point of the search or quit.
*/
indigo_event_handlers.EXPOSURE_handler = { devices: ["Imager Agent"],
    on_update: function(property) {

        if (property.name=="CCD_EXPOSURE") {

            if (property.state == "Busy" && !imaging) {
                debug("Exposure in progress...");
                imaging = true;
            } else {
                if (property.state.toUpperCase() == "OK" && imaging) {
                    imaging = false;
                    debug("Exposure completed");
                    indigo_log("Image saved :" + indigo_devices ["Imager Agent"].CCD_IMAGE_FILE.items.FILE);
                    ix++;
                    if (ix < deltaRA.length) {
                        setNewCoords(ix);
                    } else {
                        delete indigo_event_handlers.SLEW_handler;
                        delete indigo_event_handlers.EXPOSURE_handler;
                        indigo_log("Search complete!");
                    }
                }
            }
        }
    }
};

/*
 * Move on to the next place in the spiral search
 * set up image name & Search coords for FITS header
 *------------------------*/
function setNewCoords(ix){
    var imageName = "SEARCH_" + ix;
    currentRA += deltaRA[ix];
    currentDec += deltaDec[ix];
    debug("step :" +ix+ ", RA :" +currentRA.toFixed(5)+ ", Dec :" +currentDec.toFixed(5));
    mount.MOUNT_EQUATORIAL_COORDINATES.change({RA:currentRA, DEC:currentDec});
    imager.CCD_LOCAL_MODE.change({PREFIX : imageName});
    var value = buildBase60(currentRA);
    imager.CCD_SET_FITS_HEADER.change({KEYWORD: "SrchRA", VALUE:value});
    value = buildBase60(currentDec);
    imager.CCD_SET_FITS_HEADER.change({KEYWORD: "SrchDec", VALUE:value});
    moving = true;
}

/*
 * Convert floating point value for RA & Dec
 * to use Minutes & Seconds for fractional part
 */
function buildBase60(floatNumber){
    var intPart = Math.trunc(floatNumber);
    var decimal = floatNumber - intPart;
    var minsRaw = decimal * 60;
    var mins = Math.trunc(minsRaw);
    var secs = (minsRaw - mins) * 60;
    return " " +intPart+ ":" +mins+ ":" +secs.toFixed(5);
}

/*
 * Reduces log output if debugging not needed
 */
function debug(msg){
    if (debugging){
        indigo_log(msg);
    }
}

//============================================================
indigo_log("Spiral search starting...");

var currentRA = mount.MOUNT_EQUATORIAL_COORDINATES.items.RA;
var currentDec = mount.MOUNT_EQUATORIAL_COORDINATES.items.DEC;

debug("starting at RA :" +currentRA.toFixed(5)+ ", Dec :" +currentDec.toFixed(5));

imager.CCD_UPLOAD_MODE.change({CLIENT:false, LOCAL:true, BOTH:false});
imager.CCD_FRAME_TYPE.change({LIGHT:true});
imager.CCD_IMAGE_FORMAT.change({FITS:true});
imager.CCD_LOCAL_MODE.change({DIR: imagePath});

var R = imager.CCD_LENS_FOV.items.FOV_WIDTH * reductionFactor / 15;  // as RA units are Hours not degrees
var D = imager.CCD_LENS_FOV.items.FOV_HEIGHT * reductionFactor;
debug("RA step size :" +R.toFixed(5)+ ", Dec step size:"+D.toFixed(5));

const deltaRA =  [R, 0,-R,-R, 0, 0, R, R, R, 0, 0, 0,-R,-R,-R,-R, 0, 0, 0, 0, R, R, R, R, R, 0, 0, 0, 0, 0,-R,-R,-R,-R,-R,-R, 0, 0, 0, 0, 0, 0, R, R, R, R, R, R, R, 0, 0, 0, 0, 0, 0, 0]
const deltaDec = [0,-D, 0, 0, D, D, 0, 0, 0,-D,-D,-D, 0, 0, 0, 0, D, D, D, D, 0, 0, 0, 0, 0,-D,-D,-D,-D,-D, 0, 0, 0, 0, 0, 0, D, D, D, D, D, D, 0, 0, 0, 0, 0, 0, 0,-D,-D,-D,-D,-D,-D,-D]

setNewCoords(0);
