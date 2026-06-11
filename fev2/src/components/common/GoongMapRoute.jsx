import React, { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import axios from 'axios';
import { Spin, Alert, Card, Tag } from 'antd';
import { EnvironmentOutlined, ClockCircleOutlined, DashboardOutlined } from '@ant-design/icons';

goongjs.accessToken = import.meta.env.VITE_GOONG_MAP_KEY;
const REST_KEY = import.meta.env.VITE_GOONG_REST_KEY;

const GoongMapRoute = ({ originAddress, destinationAddress, onAddressChange, onRouteCalculated }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  const decodePolyline = (str, precision = 5) => {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
    while (index < str.length) {
      byte = null; shift = 0; result = 0;
      do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
      shift = result = 0;
      do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += latitude_change; lng += longitude_change;
      coordinates.push([lng / factor, lat / factor]);
    }
    return coordinates;
  };

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const res = await axios.get(`https://rsapi.goong.io/geocode?latlng=${lat},${lng}&api_key=${REST_KEY}`);
      return res.data.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
  };

  useEffect(() => {
    if (!originAddress || !destinationAddress) return;
    let isMounted = true;

    if (mapRef.current) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      mapRef.current.remove();
      mapRef.current = null;
    }

    const drawRoute = async () => {
      try {
        setLoading(true);
        setError(null);

        const originRes = await axios.get(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(originAddress)}&api_key=${REST_KEY}`);
        if (!originRes.data.results?.length) throw new Error('Lỗi tọa độ lấy hàng');
        const originCoords = originRes.data.results[0].geometry.location;

        const destRes = await axios.get(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(destinationAddress)}&api_key=${REST_KEY}`);
        if (!destRes.data.results?.length) throw new Error('Lỗi tọa độ giao hàng');
        const destCoords = destRes.data.results[0].geometry.location;

        const routeRes = await axios.get(`https://rsapi.goong.io/Direction?origin=${originCoords.lat},${originCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&vehicle=truck&api_key=${REST_KEY}`);
        if (!routeRes.data.routes?.length) throw new Error('Không thể tính toán tuyến đường');

        if (!isMounted) return;

        const leg = routeRes.data.routes[0].legs[0];
        setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
        
        // Báo cáo số Km mới về cho Form chính để tính cước
        if (onRouteCalculated) onRouteCalculated((leg.distance.value / 1000).toFixed(2));

        const decodedPath = decodePolyline(routeRes.data.routes[0].overview_polyline.points);

        const map = new goongjs.Map({
          container: mapContainerRef.current,
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: [originCoords.lng, originCoords.lat],
          zoom: 10,
        });
        mapRef.current = map;

        map.on('load', () => {
          if (!isMounted) return;
          
          // 🚀 FIX: Bật draggable để kéo thả Marker
          const originMarker = new goongjs.Marker({ color: '#1890ff', draggable: true }).setLngLat([originCoords.lng, originCoords.lat]).addTo(map);
          const destMarker = new goongjs.Marker({ color: '#cf1322', draggable: true }).setLngLat([destCoords.lng, destCoords.lat]).addTo(map);
          markersRef.current = [originMarker, destMarker];

          // 🚀 Sự kiện Kéo thả Marker Điểm Lấy
          originMarker.on('dragend', async () => {
            const lngLat = originMarker.getLngLat();
            const addr = await getAddressFromCoords(lngLat.lat, lngLat.lng);
            if (onAddressChange) onAddressChange('origin', addr);
          });

          // 🚀 Sự kiện Kéo thả Marker Điểm Giao
          destMarker.on('dragend', async () => {
            const lngLat = destMarker.getLngLat();
            const addr = await getAddressFromCoords(lngLat.lat, lngLat.lng);
            if (onAddressChange) onAddressChange('destination', addr);
          });

          map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: decodedPath } } });
          map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#cf1322', 'line-width': 5 } });

          const bounds = new goongjs.LngLatBounds([originCoords.lng, originCoords.lat], [originCoords.lng, originCoords.lat]);
          bounds.extend([destCoords.lng, destCoords.lat]);
          map.fitBounds(bounds, { padding: 60 });

          setLoading(false);
        });

      } catch (err) {
        if (isMounted) { setError(err.message || 'Lỗi bản đồ'); setLoading(false); }
      }
    };

    drawRoute();

    return () => {
      isMounted = false;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [originAddress, destinationAddress]);

  if (error) return <Alert message="Lỗi Map" description={error} type="error" showIcon />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      {routeInfo && (
        <Card size="small" style={{ borderRadius: 8, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><EnvironmentOutlined style={{ color: '#1890ff' }} /> <b>Lộ trình:</b> {originAddress} <br/> <EnvironmentOutlined style={{ color: '#cf1322' }} /> <b>Đến:</b> {destinationAddress}</span>
            <Tag color="blue" icon={<DashboardOutlined />} style={{ fontSize: 14, padding: '4px 8px' }}>{routeInfo.distance}</Tag>
            <Tag color="green" icon={<ClockCircleOutlined />} style={{ fontSize: 14, padding: '4px 8px' }}>{routeInfo.duration}</Tag>
          </div>
        </Card>
      )}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {loading && <div style={{ position: 'absolute', top: '40%', left: '45%', zIndex: 10 }}><Spin size="large" /></div>}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
        {!loading && (
          <div style={{ position: 'absolute', bottom: 30, left: 10, zIndex: 5, background: 'rgba(255,255,255,0.9)', borderRadius: 6, padding: '6px 12px', fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            🖱️ <b>Mẹo:</b> Kéo thả Marker xanh/đỏ để đổi địa chỉ
          </div>
        )}
      </div>
    </div>
  );
};

export default GoongMapRoute;