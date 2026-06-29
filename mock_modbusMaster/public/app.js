const socket = io();

socket.on(
    "state",
    updateUI
);

function zoneText(state) {

    switch (state) {

        case 1:
            return "Fault";

        case 2:
            return "Possible Fire";

        case 3:
            return "Fire";

        default:
            return "Normal";
    }
}

function detectorText(state) {
    switch (state) {

        case 1:
            return "Fault";

        case 2:
            return "Possible Fire";

        case 3:
            return "Fire";

        default:
            return "Normal";
    }
}

function updateUI(data) {

    document
        .getElementById(
            "connection"
        )
        .innerText =
        data.statistics.connected
            ? "CONNECTED"
            : "DISCONNECTED";

    document
        .getElementById(
            "stats"
        )
        .innerHTML = `
            Detectors:
            ${data.statistics.totalDetectors}
            <br>
            Zones:
            ${data.statistics.totalZones}
        `;

    const zonesBody =
        document.querySelector(
            "#zones tbody"
        );

    zonesBody.innerHTML = "";

    Object.entries(
        data.zones
    ).forEach(
        ([id, zone]) => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td>${id}</td>
                <td>${zone.exists}</td>
                <td>${zoneText(zone.state)}</td>
            `;

            zonesBody.appendChild(
                row
            );
        }
    );

    const detectorsBody =
        document.querySelector(
            "#detectors tbody"
        );

    detectorsBody.innerHTML = "";

    Object.values(
        data.detectors
    ).forEach(
        detector => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td>${detector.address}</td>
                <td>${detector.zone}</td>
                <td>${detector.type}</td>
                <td>${detectorText(detector.state)}</td>
                <td>${detector.faultType}</td>
                <td>${detector.threshold}</td>
            `;

            detectorsBody.appendChild(
                row
            );
        }
    );
}