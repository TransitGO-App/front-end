import React, { useEffect, useState } from "react";
import Heading from "../../components/heading/heading";
import "./tracking.css";
import { Stack, TextField, Button } from "@mui/material";
import map from "../../components/assets/Basemap image.png";
import Tline from "../../components/Destination/Destination";
import axios from "axios";

function Tracking() {
  const [packageID, setPackageID] = useState("");
  const [busID, setBusID] = useState(null);
  const [lastLeftStop, setLastLeftStop] = useState(null);
  const [nextLocation, setNextLocation] = useState(null);

  useEffect(() => {
    if (busID) {
      const fetchTrackingData = async () => {
        try {
          const response = await axios.get(`http://localhost:8080/bus/${busID}`);
          setLastLeftStop(response.data.lastLeftStop);
          setNextLocation(response.data.nextLocation);
        } catch (error) {
          console.error("Error fetching tracking data:", error.message);
        }
      };

      fetchTrackingData();
    }
  }, [busID]);

  const handleSearch = async () => {
    try {
      const packageResponse = await axios.get(`http://localhost:8080/package/${packageID}`);
      setBusID(packageResponse.data.busID);
    } catch (error) {
      console.error("Error fetching package data:", error.message);
    }
  };

  return (
    <div className="content">
      <div className="header">
        <p className="p1">TRACK PACKAGE</p>
        <Heading className="h1" text="Want to track your belonging?" />
      </div>
      <div className="search">
        <TextField
          className="t1"
          label="Your parcel's tracking ID"
          size="small"
          sx={{ minWidth: 600 }}
          value={packageID}
          onChange={(e) => setPackageID(e.target.value)}
        />
        <Button onClick={handleSearch} variant="contained" sx={{ ml: 2 }}>
          Search
        </Button>
      </div>
      <div className="track">
        {/* <img className="im1" src={map} />
        <div className="tline">
          <Tline />
        </div> */}
        <div className="location-info">
          <div className="last-left-stop">{lastLeftStop}</div>
          <div className="next-location">{nextLocation}</div>
        </div>
      </div>
    </div>
  );
}

export default Tracking;
