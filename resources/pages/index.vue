<template>
  <v-container fluid style="padding: 0 0 0 0">
    <v-row no-gutters style="height:47vh;max-height:47vh;overflow: hidden">
      <v-col>
        <v-container id="map" fluid fill-height></v-container>
      </v-col>
    </v-row>
    <v-row no-gutters style="height:3vh;">
      <v-col style="max-width: 15px;"></v-col>
      <v-col cols=1 style="max-width: 64px;">
        <v-btn icon @click="togglePlay">
          <v-icon color=blue v-if="!this.playing">mdi-play</v-icon>
          <v-icon color=blue v-if="playing">mdi-pause</v-icon>
        </v-btn>
      </v-col>
      <v-col fluid>
        <v-slider @input="setPlaybackPosition" :value="playbackPosition" :max="this.playbackLength"></v-slider>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols=12>
        <v-expansion-panels>
          <v-expansion-panel>
            <v-expansion-panel-header><b>Network Information</b></v-expansion-panel-header>
            <v-expansion-panel-content>
              <b>Message:</b> UDP<br/>
              <b>Drone to Drone Link:</b><br/>
              &emsp;<b>Health</b>: Good<br/>
              <b>Drone to GCS Link:</b><br/>
              &emsp;<b>Health</b>: Good<br/>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
         <line-chart v-if="chartdata.loaded" :chartdata="chartdata" :options="options"/>
      </v-col>
    </v-row>
    <v-row no-gutters style="height:50vh;max-height:50vh;overflow: auto;">
        <v-col :cols=4 v-bind:key="drone.id" v-for="drone in this.drones" style="height:50vh;max-height:50vh;overflow: auto;">
          <v-data-table dense :items="drone['data']" :headers="drone['dataHeaders']" style="height:50vh;max-height:50vh;overflow: auto;"></v-data-table>
        </v-col>
    </v-row>
  </v-container>
</template>
<script>
  class Drone {
    constructor(id, lat, lon, marker, flightPath, flightTime, dataHeaders, data) {
      this.id = id;
      this.lat = lat;
      this.lon = lon;
      this.marker = marker;
      this.flightPath = flightPath;
      this.flightTime = flightTime;
      this.dataHeaders = dataHeaders;
      this.data = data;
    }
  }
  import LineChart from '~/components/Chart.vue'
  import axios from 'axios';
  export default {
    mounted () {
      // Create the map and add the tile layer
      var map = L.map("map", { zoomControl: false, attributionControl: false });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);
      var droneIcon = L.icon({
        iconUrl: 'drone.svg',

        iconSize:     [30, 30], // size of the icon
        iconAnchor:   [15, 15], // point of the icon which will correspond to marker's location
        popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
      });
      // Download trace data
      axios.get(`/trace`)
      .then(response => {
        var group = []
        for (var drone of response['data']['drones'])
        {
          var newDrone = {}
          newDrone['data'] = [...drone['data']];
          newDrone['dataHeaders'] = drone['dataHeaders']
          newDrone.flightPath = drone["flightPath"]
          var data_layer = new L.GeoJSON(
            newDrone.flightPath,
            {
              style: L.mapbox.simplestyle.style,
              attribution:"",
              "weight": 2
            }
          )
          newDrone.flightTime = response['data']['flightTime'];
          newDrone.lat = drone['data'][this.playbackPosition]['latitude'];
          newDrone.lon = drone['data'][this.playbackPosition]['longitude'];
          // Get GeoJSON data and create features.

          newDrone.marker = L.marker([newDrone.lat, newDrone.lon],{icon: droneIcon}).addTo(data_layer);
          data_layer.addTo(map)
          group.push(newDrone.marker)
          group.push(data_layer)
          this.drones.push(newDrone)
        }
        group = new L.featureGroup(group);
        map.fitBounds(group.getBounds(), {padding: [50, 50]})
        this.playbackLength = this.drones[0]['flightTime']
        var i = 0
        for (var row of this.drones[0]['data'])
        {
          if (i > 559)
            break;
          this.chartdata.labels.push(row['Time(s)'])
          this.chartdata.datasets[0].data.push(parseFloat(row['TrackingObjectAccuracy']))
          i+=1
        }
        this.chartdata.loaded = true
      })
      .catch(e => {
        console.error(e)
      })
    },
    head: {
      script: [
        { src: 'https://api.mapbox.com/mapbox.js/v3.3.0/mapbox.js' }
      ],
      link: [
        { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox.js/v3.3.0/mapbox.css' }
      ]
    },
    data () {
      return {
        playing: false,
        playbackPosition: 0,
        playbackTimer: null,
        playbackLength: 0,
        trackingAccuracy: [],
        trackingDataLoaded: false,
        chartdata: {
          labels: [],
          datasets: [
            {
              label: 'Tracking Accuracy',
              backgroundColor: '#f87979',
              data: []
            }
          ]
        },
        loaded: false,
        options: {
          responsive: true,
          maintainAspectRatio: false
        },
        drones: []
      //   droneLat: 0.0,
      //   droneLon: 0.0,
      //   droneMarker: null,
      //   traceHeaders: [
      //     {"text": "TIMECODE", "value":"TIMECODE"},
      //     {"text": "HOME_LATITUDE", "value":"HOME_LATITUDE"},
      //     {"text": "HOME_LONGITUDE", "value":"HOME_LONGITUDE"},
      //     {"text": "DATE", "value":"DATE"},
      //     {"text": "GPS_LATITUDE", "value":"GPS_LATITUDE"},
      //     {"text": "GPS_LONGITUDE", "value":"GPS_LONGITUDE"},
      //     {"text": "GPS_SATELLITES", "value":"GPS_SATELLITES"},
      //     {"text": "BAROMETER", "value":"BAROMETER"},
      //     {"text": "ISO", "value": "ISO"},
      //     {"text": "SHUTTER", "value":"SHUTTER"},
      //     {"text": "FNUM", "value":"FNUM"},
      //     {"text": "SPEED_TWOD", "value":"SPEED_TWOD"},
      //     {"text": "SPEED_VERTICAL", "value":"SPEED_VERTICAL"},
      //     {"text": "SPEED_THREED", "value":"SPEED_THREED"},
      //     {"text": "DISTANCE", "value": "DISTANCE"}]
      }
    },
    components: { LineChart },
    methods: {
      togglePlay() {
        this.playing = !this.playing
        if (this.playing)
          this.play()
        else
          this.pause()
      },
      play() {
        this.pause()
        // Start a new interval
        this.playbackTimer = setInterval(() => {
          if (this.playing)
          {
            this.setPlaybackPosition(this.playbackPosition += 1)
            for (var drone of this.drones)
            {
              drone.lat = parseFloat(drone['data'][this.playbackPosition].latitude)
              drone.lon = parseFloat(drone['data'][this.playbackPosition].longitude)
              drone.marker.setLatLng(new L.LatLng(drone.lat, drone.lon))
            }
          }
        }, 1000)
      },
      pause() {
        // Stop the existing ticking
        if (this.playbackTimer != null)
          clearInterval(this.playbackTimer)
      },
      setPlaybackPosition(event) {
        this.playbackPosition = event;
      },
    }
  }
</script>

<style>
  body {
    padding: 0;
    margin: 0;
    background-color: #ccc;
  }
  .v-btn::before, .v-btn:active::before {
    display: none;
  }
</style>