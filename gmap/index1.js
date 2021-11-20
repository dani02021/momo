let map;
let markers = [];
let zoom = 6;

function initMap() {
  getData(-1, -1, -1, -1);
}

// Saves the data from API to mysql DB

function getDataFromAPI(starttime, endtime) {
   jQuery.ajax({
    type: "POST",
    url: "../../index1.php",
    dataType: 'json',
    data: {function: 'getDataFromAPI', args: [starttime, endtime]},

    success: function (obj) {
      if('error' in obj) {
         document.getElementById('count').innerHTML = obj.error;
      } else console.log(obj);
    },
    error: function (request, status, error) {
        console.log(request.responseText);
        console.log(error);
    }
});
}

function getData(starttime, endtime, minmagnitude, maxmagnitude) {
   map = new google.maps.Map(document.getElementById("map"), {
              center: { lat: 42.695537, lng: 23.2539072 },
              zoom: zoom});
   
   var argNames = ['starttime','endtime','minmagnitude','maxmagnitude'];
   args = {};
   count = 0;

   document.getElementById('count').innerHTML = 'Count: Loading...';
   
   // Called from form
   if(arguments.length == 0) {
      // Start time
      args.starttime = document.getElementById('starttime').value;
      if(!(document.getElementById('starttime').value))
         args.starttime = -1;
         
      start = new Date(args.starttime);
      args.starttime = start.getTime();
      
      // End time
      args.endtime = document.getElementById('endtime').value;
      if(!(document.getElementById('endtime').value))
         args.endtime = -1;
      
      end = new Date(args.endtime);

      if(start.getTime() == end.getTime() && start.getTime() != -1)
         end.setDate(end.getDate() + 1);

      args.endtime = end.getTime();
      
      // Min magnitude
      args.minmagnitude = document.getElementById('minmagnitude').value;
      if(!(document.getElementById('minmagnitude').value))
         args.minmagnitude = "-1";
      
      // Max magnitude
      args.maxmagnitude = document.getElementById('maxmagnitude').value;
      if(!(document.getElementById('maxmagnitude').value))
         args.maxmagnitude = "-1";
      
      // Check for invalid values
      for(num in args) {
         arg = args[num];
         bol = +arg;
         if(bol === 0)
            bol = true;
         
         if(!bol) {
            document.getElementById('count').innerHTML = 'Error (Invalid arguments)';
            return;
         }
      }
      
   } else {
      // Check for invalid arguments
      for(num in arguments) {
         arg = arguments[num];
         if(arg !== -1) {
           args[argNames[num]] = arg;
         }
         
         if(!(typeof arg === 'number')) {
           console.log(arg + " is not a valid argument!");
           return;
         }
      }
   }

   jQuery.ajax({
           type: "POST",
           url: '../../index1.php',
           dataType: 'json',
           data: {function: 'getData', args: JSON.stringify(args)},
           
           success: function (obj) {
              markers = [];
              
              if('error' in obj) {
                      document.getElementById('count').innerHTML = obj.error;
              } else {
                  // Add markers to the map
                  for(key in obj.result) {
                     loc = obj.result[key];
                     
                     title = "";
                     
                     for(prp in loc) {
                        title += prp + ": " + loc[prp] + '\n';
                     }

                     count++;
                      
                     markers.push(new google.maps.Marker({
                          position: { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) },
                         map: map, title: title}));
                  }
              }
                  
                  document.getElementById('count').innerHTML = 'Count: ' + count;
                  new MarkerClusterer(map, markers, {imagePath:"https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/images/m",});
           },
           error: function (request, status, error) {
              console.log(request.responseText);
              console.log(error);
              document.getElementById('count').innerHTML = 'Error: ' + error;
           }
           });
}