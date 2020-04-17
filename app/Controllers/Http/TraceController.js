'use strict'
const Drive = use('Drive')
const Helpers = use('Helpers')
const Parse = require('csv-parse/lib/sync')

function extractColumns(arr, columns, removeStr) {
    return arr.map((x) => {
        var result = {}
        columns.forEach((column, index) =>
        {
            result[column.replace(removeStr, '')] = x[column]
        });
        return result
    })
}
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
function getFlightPath(drone)
{
    var coords = extractColumns(drone.data, ['latitude', 'longitude'])
    const uniqueCoords = [];
    const map = new Map();
    for (const item of coords) {
        if(!map.has(item.latitude + "," + item.longitude)){
            map.set(item.latitude + "," + item.longitude, true);    // set any value to Map
            uniqueCoords.push([parseFloat(item.longitude), parseFloat(item.latitude)]);
        }
    }
    var strokeColor = ""
    switch (drone.id)
    {
        case 1:
            strokeColor = "#FF0000"
            break;
        case 2:
            strokeColor = "#00FF00"
            break;
        case 3:
            strokeColor = "#0000FF"
            break;
        default:
            strokeColor = "#FFFFFF"
            break;
    }
    var traceLine = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: uniqueCoords
        },
        properties: {
            "stroke": strokeColor
        }
    }
    return traceLine;
}
class TraceController {
    async getTrace({request, response})
    {
        var data = await Drive.get('sample.csv')
        const records = Parse(data.toString(), {
            columns: true,
            skip_empty_lines: true
        })
        var drones = []
        var flightTime = records.length
        var sharedHeaders = []
        for (var key of Object.keys(records[0]))
        {
            if (key.includes('drone'))
            {
                var match = key.match(/drone([0-9]+)/);
                var index = match[1]
                var group = match[0]
                var trimmedKey = match['input'].replace(group,'')
                // If the key indicates a new drone, create one
                if (drones.length < index)
                    drones.push({
                        id: parseInt(index),
                        lat: null,
                        lon: null,
                        marker: null,
                        flightPath: null,
                        flightTime: null,
                        dataHeaders: [],
                        tmpHeaders: [],
                        data: []
                    })
                drones[index-1]['dataHeaders'].push({text: trimmedKey, value: trimmedKey})
                drones[index-1]['tmpHeaders'].push(key)
            }
            else
            {
                sharedHeaders.push(key)
            }
        }
        for (var header of sharedHeaders)
        {
            for (var drone of drones)
            {
                drone['dataHeaders'].push({text: header, value: header})
                drone['tmpHeaders'].push(header)
            }
        }
        for (var drone of drones)
        {
            drone['data'] = extractColumns(records, drone.tmpHeaders, 'drone' + drone.id)
        }
        // Initialize drone to first record
        for (var drone of drones)
        {
            drone['lat'] = parseFloat(drone['data'][0]['latitude'])
            drone['lon'] = parseFloat(drone['data'][0]['longitude'])
            drone['flightTime'] = parseInt(flightTime)
            drone['flightPath'] = getFlightPath(drone)
        }
        return {
            'flightTime': flightTime,
            'drones': drones
        }
    }
}

module.exports = TraceController