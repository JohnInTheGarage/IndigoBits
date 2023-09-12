/*
* Custom Parking for Indigo
*
* When you want to leave the scope in a non-standard orientation.
*
* Developed because I park my scope pointing east-west but its quite old
* so only remembers the celestial pole.
*
* Script provided for use at your own risk, please test it first with the Mount Simulator
* before using with a real mount.
*/

"use strict"
// change these for your custom position
var reqdAltitude = 0;
var reqdAzimuth = 270;

// Should be no need to change these variables that follow
var myTelescope = indigo_devices["Mount Agent"];
var customParkingActive = false;
var prevSeconds = -1;
var seconds;
var custom = "Custom Parking: ";
var txtStart = custom + "Script started...";
var txtDone = custom + "Script finished...";
var txtSlewStart = custom + "Slew in progress...";
var txtSlewDone = custom + "Slew complete";


/*
 * Detect when the mount stops moving
 */
indigo_event_handlers.JK_handler = { devices: ["Mount Agent"],

    on_update: function(property) {
       if (property.name.toUpperCase() === "MOUNT_HORIZONTAL_COORDINATES" && customParkingActive) {
           if (property.state.toUpperCase() === "BUSY") {
               seconds = new Date().getSeconds();
               if (seconds != prevSeconds){  // prevent surplus log messages
                    indigo_log(txtSlewStart);
               }
               prevSeconds = seconds;

           } else {
               if (property.state.toUpperCase() == "OK") {
                   indigo_log(txtSlewDone);
                   customParkingActive = false;
                   myTelescope.MOUNT_TRACKING.change({ ON:false, OFF:true });
                   myTelescope.MOUNT_PARK.change({PARKED:true,UNPARKED:false});
                   delete indigo_event_handlers.JK_handler;
               }
           }
       }
    }
};

//============================================================
indigo_log(txtStart);
indigo_log("----- parameters used --------");
indigo_log("Required Azimuth :" +reqdAzimuth);
indigo_log("Required Altitude :" +reqdAltitude);

myTelescope.MOUNT_PARK.change({PARKED:false,UNPARKED:true});
customParkingActive = true;
myTelescope.MOUNT_HORIZONTAL_COORDINATES.change({AZ:reqdAzimuth, ALT:reqdAltitude});




