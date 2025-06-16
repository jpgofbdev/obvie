//let lastGeoJSON4326 = null;
let currentPolygon = null;






export function sendPostRequest(coords, map) {
    
    console.log("Map object:", map); // Ajoutez ceci pour vérifier si 'map' est défini
    if (!map) {
        console.error("La carte n'est pas définie !");
        return;
    }


     function convertGeoJSON(geojson, fromProj, toProj) {
        var newGeoJSON = JSON.parse(JSON.stringify(geojson));
        newGeoJSON.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates = feature.geometry.coordinates.map(polygon => {
                    return polygon.map(ring => {
                        return ring.map(coord => {
                            var convertedCoord = proj4(fromProj, toProj, coord);
                            return [convertedCoord[0], convertedCoord[1]];
                        });
                    });
                });
            }
        });
        return newGeoJSON;
    }   
     
    function calculateBBoxFromGeoJSON(geojson) {
       
        geojson.features.forEach(feature => {
            if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon => {
                    polygon.forEach(ring => {
                        ring.forEach(coord => {
                            if (bbox.length === 0) {
                                bbox = [coord[0], coord[1], coord[0], coord[1]];
                            } else {
                                bbox[0] = Math.min(bbox[0], coord[0]);
                                bbox[1] = Math.min(bbox[1], coord[1]);
                                bbox[2] = Math.max(bbox[2], coord[0]);
                                bbox[3] = Math.max(bbox[3], coord[1]);
                            }
                        });
                    });
                });
            }
        });
        return bbox.length ? bbox : null;
    
    }


  
    
    const urlbv = 'https://reseau.eaufrance.fr/geotraitements/bassin-versant/services/wps/ows?service=WPS&version=1.0.0&request=Execute';
    const headers = {
        'Content-Type': 'application/xml'
    };
    const body = `
<wps:Execute service="WPS" version="1.0.0"
    xmlns:wps="http://www.opengis.net/wps/1.0.0"
    xmlns:ows="http://www.opengis.net/ows/1.1"
    xmlns:wfs="http://www.opengis.net/wfs/1.0.0"
    xmlns:gml="http://www.opengis.net/gml/3.2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsExecute_request.xsd">
    <ows:Identifier>sie:pts2watershed</ows:Identifier>
    <wps:DataInputs>
        <wps:Input>
            <ows:Identifier>compute_points</ows:Identifier>
            <wps:Data>
                <wps:ComplexData mimeType="application/json">
{
"type": "FeatureCollection",
"name": "json2",
"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::2154" } },
"features": [
{ "type": "Feature", "properties": { "gml_id": "2pts.0", "id": 1 }, "geometry": { "type": "Point", "coordinates": [ ${coords[0]}, ${coords[1]} ] } }
]
}
</wps:ComplexData>
            </wps:Data>
        </wps:Input>
    </wps:DataInputs>
    <wps:ResponseForm>
        <wps:RawDataOutput mimeType="application/json">
            <ows:Identifier>result</ows:Identifier>
        </wps:RawDataOutput>
    </wps:ResponseForm>
</wps:Execute>`; // Votre corps de requête ici

    fetch(urlbv, {
        method: 'POST',
        headers: headers,
        body: body
    })
    .then(response => response.text())
    .then(text => {
        console.log("Raw response data:", text); // Afficher la réponse brute pour débogage

        try {
            var data = JSON.parse(text); // Essayer de parser la réponse comme JSON
            console.log("Parsed GeoJSON:", data);

            var geojson4326 = convertGeoJSON(data, 'EPSG:2154', 'EPSG:4326');//le serveur BRGM renvoie du 2154 on convertit en 4326
            lastGeoJSON4326 = geojson4326;                                  // la variable lastGeoJSON4326 est initialisée

            if (currentPolygon) {
                map.removeLayer(currentPolygon);                            //evidemment au clic on supprimme l'ancien polygone BV 
            }

            currentPolygon = L.geoJSON(geojson4326, {                       //et on calcule le nouveau à chaque clic
                style: {
                    color: 'blue'
                }
            }).addTo(map);
                
            

            //var 
            window.bbox = calculateBBoxFromGeoJSON(geojson4326);                   //calcul de la bbox
            console.log("Calculated BBOX:", bbox);

                                      //////////je teste si ça marche sans ->ok

        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    })
    .catch(error => console.error('Error:', error));
}
