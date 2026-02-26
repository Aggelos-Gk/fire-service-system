import React, { useEffect, useMemo, useRef, useState } from "react";
import "./freemap.css";
import "./theme-overrides.css";

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function clampLat(lat) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function project(lat, lon, zoom) {
  const safeLat = clampLat(lat);
  const scale = TILE_SIZE * (2 ** zoom);
  const x = ((lon + 180) / 360) * scale;
  const latRad = (safeLat * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;

  return { x, y };
}

function normalizeLon(lon) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

function unproject(x, y, zoom) {
  const scale = TILE_SIZE * (2 ** zoom);
  const lon = normalizeLon((x / scale) * 360 - 180);
  const mercator = Math.PI * (1 - (2 * y) / scale);
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(mercator));
  return { lat: clampLat(lat), lon };
}

function wrapTileX(x, zoom) {
  const max = 2 ** zoom;
  return ((x % max) + max) % max;
}

function markerColor(type) {
  if (type === "user") return "#c9c9c9";
  if (type === "incident") return "#a8a8a8";
  return "#8f8f8f";
}

function clampZoom(zoom) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

function FreeMap({ center, markers = [], zoom = 12, height = 320 }) {
  const containerRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    centerPx: null
  });
  const [size, setSize] = useState({ width: 0, height });
  const [zoomLevel, setZoomLevel] = useState(clampZoom(zoom));
  const [viewCenter, setViewCenter] = useState(center || null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setZoomLevel(clampZoom(zoom));
  }, [zoom]);

  useEffect(() => {
    if (!center || typeof center.lat !== "number" || typeof center.lon !== "number") {
      setViewCenter(null);
      return;
    }
    setViewCenter({ lat: center.lat, lon: center.lon });
  }, [center]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const element = containerRef.current;
    const updateSize = () => {
      setSize({ width: element.clientWidth, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [height]);

  const renderData = useMemo(() => {
    if (!viewCenter || typeof viewCenter.lat !== "number" || typeof viewCenter.lon !== "number" || !size.width) {
      return { tiles: [], pins: [] };
    }

    const centerPx = project(viewCenter.lat, viewCenter.lon, zoomLevel);
    const topLeft = {
      x: centerPx.x - size.width / 2,
      y: centerPx.y - size.height / 2
    };

    const startTileX = Math.floor(topLeft.x / TILE_SIZE);
    const endTileX = Math.floor((topLeft.x + size.width) / TILE_SIZE);
    const startTileY = Math.floor(topLeft.y / TILE_SIZE);
    const endTileY = Math.floor((topLeft.y + size.height) / TILE_SIZE);
    const maxTile = 2 ** zoomLevel;

    const tiles = [];
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
        if (tileY < 0 || tileY >= maxTile) continue;
        const wrappedX = wrapTileX(tileX, zoomLevel);
        const left = tileX * TILE_SIZE - topLeft.x;
        const top = tileY * TILE_SIZE - topLeft.y;

        tiles.push({
          id: `${tileX}-${tileY}`,
          src: `https://tile.openstreetmap.org/${zoomLevel}/${wrappedX}/${tileY}.png`,
          left,
          top
        });
      }
    }

    const pins = markers
      .filter((item) => typeof item.lat === "number" && typeof item.lon === "number")
      .map((item) => {
        const pixel = project(item.lat, item.lon, zoomLevel);
        return {
          ...item,
          left: pixel.x - topLeft.x,
          top: pixel.y - topLeft.y
        };
      })
      .filter((pin) =>
        pin.left >= -20 &&
        pin.left <= size.width + 20 &&
        pin.top >= -20 &&
        pin.top <= size.height + 20
      );

    return { tiles, pins };
  }, [markers, size.height, size.width, viewCenter, zoomLevel]);

  return (
    <div
      className={`free-map ${dragging ? "dragging" : ""}`}
      ref={containerRef}
      style={{ height }}
      onWheel={(event) => {
        if (!viewCenter || !containerRef.current) return;
        if (event.cancelable) {
          event.preventDefault();
        }
        const direction = event.deltaY < 0 ? 1 : -1;
        const nextZoom = clampZoom(zoomLevel + direction);
        if (nextZoom === zoomLevel) return;

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const centerPx = project(viewCenter.lat, viewCenter.lon, zoomLevel);
        const topLeft = {
          x: centerPx.x - rect.width / 2,
          y: centerPx.y - rect.height / 2
        };
        const focusPoint = {
          x: topLeft.x + mouseX,
          y: topLeft.y + mouseY
        };

        const scale = 2 ** (nextZoom - zoomLevel);
        const focusedAtNext = {
          x: focusPoint.x * scale,
          y: focusPoint.y * scale
        };
        const newCenterPx = {
          x: focusedAtNext.x - mouseX + rect.width / 2,
          y: focusedAtNext.y - mouseY + rect.height / 2
        };
        setViewCenter(unproject(newCenterPx.x, newCenterPx.y, nextZoom));
        setZoomLevel(nextZoom);
      }}
      onMouseDown={(event) => {
        if (!viewCenter) return;
        if (event.button !== 0) return;
        const target = event.target;
        if (
          target instanceof Element &&
          (target.closest(".free-map-zoom") || target.closest(".free-map-attribution"))
        ) {
          return;
        }
        dragStateRef.current = {
          active: true,
          startClientX: event.clientX,
          startClientY: event.clientY,
          centerPx: project(viewCenter.lat, viewCenter.lon, zoomLevel)
        };
        setDragging(true);
      }}
      onMouseMove={(event) => {
        if (!dragStateRef.current.active || !dragStateRef.current.centerPx) {
          return;
        }
        const deltaX = event.clientX - dragStateRef.current.startClientX;
        const deltaY = event.clientY - dragStateRef.current.startClientY;
        const centerPx = {
          x: dragStateRef.current.centerPx.x - deltaX,
          y: dragStateRef.current.centerPx.y - deltaY
        };
        setViewCenter(unproject(centerPx.x, centerPx.y, zoomLevel));
      }}
      onMouseUp={() => {
        dragStateRef.current.active = false;
        setDragging(false);
      }}
      onMouseLeave={() => {
        dragStateRef.current.active = false;
        setDragging(false);
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {!viewCenter && <div className="free-map-empty">Map unavailable</div>}

      <div className="free-map-zoom">
        <button
          type="button"
          className="free-map-zoom-btn"
          onClick={() => setZoomLevel((current) => clampZoom(current + 1))}
        >
          +
        </button>
        <button
          type="button"
          className="free-map-zoom-btn"
          onClick={() => setZoomLevel((current) => clampZoom(current - 1))}
        >
          -
        </button>
      </div>

      {renderData.tiles.map((tile) => (
        <img
          key={tile.id}
          src={tile.src}
          className="free-map-tile"
          style={{ left: `${tile.left}px`, top: `${tile.top}px` }}
          alt=""
          draggable={false}
        />
      ))}

      {renderData.pins.map((pin) => (
        <div
          key={pin.id}
          className="free-map-pin"
          style={{
            left: `${pin.left}px`,
            top: `${pin.top}px`,
            background: markerColor(pin.type || "default")
          }}
          title={pin.label || ""}
        />
      ))}

      <a
        className="free-map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}

export default FreeMap;
