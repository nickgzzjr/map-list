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
    private selectedMarker;

    constructor(map, list, options) {

        this.map = map;
        this.list = list;
        this.options = Object.assign({
            orderByNearest: false,
            showSitesInMapBoundsOnly: false,
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

        marker.addListener('click', event => {
            if (event.type === 'touchend') {
                this.select(marker, true);
            }
            this.options.click(marker['item']);
        });

        marker.addListener('mouseover', () => {
            this.select(marker, true);
        });

        marker.addListener('mouseout', () => {
            this.deselect(marker);
        });

        this.createItem(marker);
        this.markerCluster.addMarker(marker);
        this.markers.push(marker);
    }

    private createItem(marker) {

        const item = document.createElement('div');
        item.classList.add(this.options.listItemClass);
        item.innerHTML = this.options.getListItemTemplate(marker.site);

        item.addEventListener('touchstart', event => {
            item['touchstartX'] = event.touches[0].pageX;
            item['touchstartY'] = event.touches[0].pageY;
        });

        item.addEventListener('touchend', event => {

            event.preventDefault();

            let distance = getTouchDistance(
                item['touchstartX'],
                event.changedTouches[0].pageX,
                item['touchstartY'],
                event.changedTouches[0].pageY
            );

            if (distance < 9) {
                this.click(marker);
                this.select(marker);
            }

        });

        item.addEventListener('click', () => {
            this.click(marker);
        });

        item.addEventListener('mouseenter', () => {
            if (!this.map.getBounds().contains(marker.position)) {
                this.preventRender = true;
                this.map.setZoom(6);
                this.map.panTo(marker.position);
            }
            this.select(marker);
        });

        item.addEventListener('mouseleave', () => {
            this.deselect(marker);
        });

        marker.item = item;
    }

    private renderList() {

        if (this.preventRender) {

            this.markerCluster.redraw();
            this.preventRender = false;

            return;
        }

        let markers = this.filteredMarkers.concat();

        if (this.options.showSitesInMapBoundsOnly) {

            markers = markers.filter(marker => this.map.getBounds().contains(marker.position));

        }

        if (this.options.orderByNearest) {

            const center = this.map.getCenter();

            markers = markers.sort((a, b) => {
                return getDistance(a.position, center) - getDistance(b.position, center);
            });

        }

        while (this.list.hasChildNodes()) {
            this.list.removeChild(this.list.lastChild);
        }

        this.list.scrollTop = 0;

        if (markers.length === 0) {

            const emptyMessage = document.createElement('div');
            emptyMessage.classList.add(this.options.listItemClass);
            emptyMessage.innerHTML = this.options.emptyMessageTemplate;

            this.list.appendChild(emptyMessage);

        } else {

            for (const s in markers) {

                this.list.appendChild(markers[s].item);

            }

        }

    }

    private click(marker) {

        this.preventRender = true;
        this.map.setZoom(10);
        this.map.panTo(marker.position);
        this.options.click(marker.item);

    }

    private select(marker, scroll = false) {

        if (this.selectedMarker && this.selectedMarker !== marker) {
            this.deselect(this.selectedMarker);
        }

        this.selectedMarker = marker;

        if (scroll) {

            marker['item'].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

        }

        marker.item.classList.add(this.options.listItemHoverClass);

        if (marker.getMap() === null) {
            this.markerCluster.removeMarker(marker);
            marker.setMap(this.map);
            marker.isTemporary = true;
        }

        if (this.options.hoverMarkerIcon !== undefined) {
            marker.setIcon(this.options.hoverMarkerIcon);
        }

        marker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);

    }

    private deselect(marker) {

        marker.item.classList.remove(this.options.listItemHoverClass);
        marker.setIcon(null);
        marker.setZIndex(0);
        if (marker.isTemporary) {
            this.markerCluster.addMarker(marker);
            marker.isTemporary = false;
        }

    }

    filter() {

        this.filteredMarkers = this.markers.concat().filter(marker => {

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

    random() {

        return `<h3>${site.Name}</h3><h6>${site.Address}</h6><div class="modal fade bd-example-modal-lg show" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-scrollable" role="document"><div class="modal-content"><div class="modal-header"><h3 class="modal-title" id="exampleModalLabel">${site.Name}</h3><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button></div><div class="modal-body text-left"><h4>${site.Address}</h4>${htmlDecode(site.Message)}</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button></div></div></div></div>`;
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

function getTouchDistance(x1, x2, y1, y2) {
    let x = x2 - x1;
    let y = y2 - y1;
    return Math.sqrt((x * x) + (y * y));
}