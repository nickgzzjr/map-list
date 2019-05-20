import MarkerClusterer from '@google/markerclusterer';

export default class MapList {

    private readonly map;
    private readonly list;
    private readonly options;

    private readonly markerCluster;

    private readonly sites = [];
    markers = [];
    private filteredMarkers = [];

    private preventRender = false;

    constructor(map, list, options) {

        this.map = map;
        this.list = list;
        this.options = Object.assign({
            renderListDebounce: 300,
            listItemClass: 'item',
            listItemHoverClass: 'selected',
        }, options);

        this.markerCluster = new MarkerClusterer(map, [], {
            imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
        });

        if (!Array.isArray(options.sites)) {

            console.error('Sites is not an array!');

            return
        }

        this.sites = options.sites;

        for (const s in this.sites) {
            this.createMarker(this.sites[s]);
        }

        this.filteredMarkers = this.markers.concat();

        this.renderList();
        this.preventRender = true;

        let timeout;
        google.maps.event.addListener(map, 'bounds_changed', () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                this.renderList();
            }, this.options.renderListDebounce);
        });

    }

    private createMarker(site) {
        let position;

        if ((this.options.getPosition === undefined)) {
            position = site.position;
        } else {
            position = this.options.getPosition(site);
        }

        const marker = new google.maps.Marker({
            position: position
        });

        marker['site'] = site;
        marker.addListener('click', () => {
            this.options.click(marker['item']);
        });
        marker.addListener('mouseover', () => {
            marker['item'].classList.add("selected");
            marker['item'].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            if (this.options.hoverMarkerIcon !== undefined) {
                marker.setIcon(this.options.hoverMarkerIcon);
            }
            marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
        });
        marker.addListener('mouseout', () => {
            marker['item'].classList.remove("selected");
            marker.setIcon(null);
            marker.setZIndex(0);
        });
        this.markerCluster.addMarker(marker);
        this.markers.push(marker);
    }

    private renderList() {

        if (this.preventRender) {

            this.markerCluster.redraw();
            this.preventRender = false;

            return;
        }

        const center = this.map.getCenter();

        const sortedMarkers = this.filteredMarkers.sort((a, b) => {
            return getDistance(a.position, center) - getDistance(b.position, center);
        });

        while (this.list.hasChildNodes()) {
            this.list.removeChild(this.list.lastChild);
        }

        this.list.scrollTo({top: 0});

        if (sortedMarkers.length === 0) {

            const emptyMessage = document.createElement('div');
            emptyMessage.classList.add(this.options.listItemClass);
            emptyMessage.innerHTML = this.options.emptyMessageTemplate;

            this.list.appendChild(emptyMessage);

        } else {

            for (const s in sortedMarkers) {

                this.renderListItem(sortedMarkers[s]);

            }

        }

    }

    private renderListItem(marker) {

        if (!marker.item) {
            const item = document.createElement('div');
            item.classList.add(this.options.listItemClass);
            item.innerHTML = this.options.getListItemTemplate(marker.site);
            item.addEventListener('click', () => {
                this.preventRender = true;
                this.map.setZoom(10);
                this.map.panTo(marker.position);
                this.options.click(item);
            });
            item.addEventListener('mouseenter', () => {
                if (!this.map.getBounds().contains(marker.position)) {
                    this.preventRender = true;
                    this.map.setZoom(6);
                    this.map.panTo(marker.position);
                }
                item.classList.add(this.options.listItemHoverClass);
                if (marker.getMap() === null) {
                    this.markerCluster.removeMarker(marker);
                    marker.setMap(this.map);
                    marker.isTemporary = true;
                }
                if (this.options.hoverMarkerIcon !== undefined) {
                    marker.setIcon(this.options.hoverMarkerIcon);
                }
                marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
            });
            item.addEventListener('mouseleave', () => {
                item.classList.remove(this.options.listItemHoverClass);
                marker.setIcon(null);
                marker.setZIndex(0);
                if (marker.isTemporary) {
                    this.markerCluster.addMarker(marker);
                    marker.isTemporary = false;
                }
            });

            marker.item = item;

        }

        this.list.appendChild(marker.item);

    }

    filter() {

        this.filteredMarkers = this.markers.concat().filter((marker) => {

            const show = this.options.filter(marker.site);

            if (show) {
                if (marker.isFiltered) {
                    this.markerCluster.addMarker(marker);
                    marker.isFiltered = false;
                }
            } else {
                this.markerCluster.removeMarker(marker);
                marker.isFiltered = true;
            }

            return show;

        });

        this.renderList();

    }

}

function rad(x) {
    return x * Math.PI / 180;
}

function getDistance(p1, p2) {
    // Earth’s mean radius in meter
    const R = 6378137;
    const dLat = rad(p2.lat() - p1.lat());
    const dLong = rad(p2.lng() - p1.lng());
    const a = Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
        Math.cos(rad(p1.lat())) *
        Math.cos(rad(p2.lat())) *
        Math.sin(dLong / 2) *
        Math.sin(dLong / 2);
    // returns the distance in meter
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}