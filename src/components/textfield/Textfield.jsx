import React, { useEffect, useState } from 'react';
import { TextField, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import LoginButton from "../../components/LoginButton/LoginButton";
import axios from "axios";
import './textfield.css';
import Bill from '../../components/Bill/Bill';

function Textfield() {
  const token = localStorage.getItem('token');
  const Authorization = {
    headers: {Authorization: `Bearer ${token}`}
  }
  const [pack, setPack] = useState({
    busID: "",
    destination: "",
    payment: "",
    receivedDate: "",
    start: "",
    status: "",
    receiverName: "",
    receiverContact: "",
    receiverNIC: ""
  });

  const [busStops, setBusStops] = useState([]);
  const [availableBuses, setAvailableBuses] = useState([]);
  const [errors, setErrors] = useState({
    fromError: false,
    toError: false,
    sameStopError: false,
    dateError: false,
    receiverNameError: false,
    receiverNICError: false,
    receiverContactError: false
  });
  const [billDetails, setBillDetails] = useState(null);
  const [billOpen, setBillOpen] = useState(false);
  const { busID, destination, receivedDate, start, receiverName, receiverContact, receiverNIC } = pack;

  useEffect(() => {
    fetchBusStops();
  }, []);

  useEffect(() => {
    if (start && destination && receivedDate) {
      fetchAvailableBuses();
    }
  }, [start, destination, receivedDate]);

  const fetchBusStops = async () => {
    try {
      const response = await axios.get("http://localhost:8080/busstops",Authorization);
      setBusStops(response.data);
    } catch (error) {
      console.error("Error fetching bus stops:", error);
    }
  };

  const fetchAvailableBuses = async () => {
    const direction = calculateDirection(start, destination);
    try {
      const response = await axios.get(`http://localhost:8080/bus/search`, {
        params: {
          from: start,
          to: destination,
          direction: direction,
          date: receivedDate,
        },
      },Authorization);

      const buses = response.data;
      const busesWithSchedules = await Promise.all(
        buses.map(async (bus) => {
          const scheduleResponse = await axios.get(`http://localhost:8080/bus/${bus.id}/stops`,Authorization);
          const schedules = scheduleResponse.data;
          const fromStopSchedule = schedules.find(
            (schedule) => schedule.busStop.name === start && schedule.direction === direction
          );
          const routeResponse = await axios.get(`http://localhost:8080/busroute/${bus.routeNo}`,Authorization);
          const routeName = routeResponse.data.routename;

          return {
            ...bus,
            routeName,
            fromStopDepartureTime: fromStopSchedule ? (fromStopSchedule.departureTime === null ? fromStopSchedule.arrivalTime : fromStopSchedule.departureTime) : 'N/A'
          };
        })
      );
      setAvailableBuses(busesWithSchedules);
    } catch (error) {
      console.error("Error fetching available buses:", error);
    }
  };

  const calculateDirection = (from, to) => {
    const fromStop = busStops.find(stop => stop.name === from);
    const toStop = busStops.find(stop => stop.name === to);
    return fromStop && toStop && fromStop.orderIndex < toStop.orderIndex ? "up" : "down";
  };

  const validateReceiverName = (name) => /^[A-Za-z\s]+$/.test(name);
  const validateReceiverNIC = (nic) => /^\d{9,12}[V]?$/.test(nic);
  const validateReceiverContact = (contact) => /^\d{9,10}$/.test(contact);

  const onInputChange = (e) => {
    const { name, value } = e.target;
    setPack(prevPack => ({ ...prevPack, [name]: value }));

    if (name === 'start' || name === 'destination') {
      setErrors(prevErrors => ({
        ...prevErrors,
        fromError: false,
        toError: false,
        sameStopError: false
      }));

      if (name === 'start' && value === destination) {
        setErrors(prevErrors => ({ ...prevErrors, sameStopError: true }));
      }
      if (name === 'destination' && value === start) {
        setErrors(prevErrors => ({ ...prevErrors, sameStopError: true }));
      }
    }

    if (name === 'receivedDate') {
      setErrors(prevErrors => ({ ...prevErrors, dateError: false }));
    }

    if (name === 'receiverName' && !validateReceiverName(value)) {
      setErrors(prevErrors => ({ ...prevErrors, receiverNameError: true }));
    } else if (name === 'receiverName') {
      setErrors(prevErrors => ({ ...prevErrors, receiverNameError: false }));
    }

    if (name === 'receiverNIC' && !validateReceiverNIC(value)) {
      setErrors(prevErrors => ({ ...prevErrors, receiverNICError: true }));
    } else if (name === 'receiverNIC') {
      setErrors(prevErrors => ({ ...prevErrors, receiverNICError: false }));
    }

    if (name === 'receiverContact' && !validateReceiverContact(value)) {
      setErrors(prevErrors => ({ ...prevErrors, receiverContactError: true }));
    } else if (name === 'receiverContact') {
      setErrors(prevErrors => ({ ...prevErrors, receiverContactError: false }));
    }
  };

  const onSubmitPack = async (e) => {
    e.preventDefault();
    const newErrors = {
      fromError: !start,
      toError: !destination,
      sameStopError: start === destination,
      dateError: !receivedDate,
      receiverNameError: !validateReceiverName(receiverName),
      receiverNICError: !validateReceiverNIC(receiverNIC),
      receiverContactError: !validateReceiverContact(receiverContact)
    };

    setErrors(newErrors);

    const hasError = Object.values(newErrors).some(error => error);
    if (hasError) return;

    try {
      const response = await axios.post("http://localhost:8080/package", pack,Authorization);
      const packageID = response.data.packageID;
      const selectedBus = availableBuses.find(bus => bus.id === busID);

      const billInfo = {
        packageID: packageID,
        busRegNo: selectedBus.regNo,
        departureTime: selectedBus.fromStopDepartureTime,
        start: start,  // You can add logic to fetch the arrival time
        conductorContact: ''
      };
      setBillDetails(billInfo);
      setBillOpen(true);

      setPack({
        busID: '',
        destination: '',
        payment: '',
        receivedDate: '',
        start: '',
        status: '',
        receiverName: '',
        receiverContact: '',
        receiverNIC: ''
      });
    } catch (error) {
      console.error("Error in submitting: ", error);
    }
  };

  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <>
      <form onSubmit={onSubmitPack}>
        <div>
          <FormControl className='select-from' sx={{ minWidth: 250, mt: 3, mr: 1 }}>
            <InputLabel>From</InputLabel>
            <Select
              name='start'
              value={start}
              onChange={onInputChange}
              label="From Station"
              error={errors.fromError || errors.sameStopError}
              required
            >
              {busStops.map((stop) => (
                <MenuItem key={stop.id} value={stop.name}>{stop.name}</MenuItem>
              ))}
            </Select>
            {(errors.fromError || errors.sameStopError) && (
              <div className="error">
                {errors.fromError ? "From stop is required" : errors.sameStopError ? "From and To stops cannot be the same" : ""}
              </div>
            )}
          </FormControl>

          <FormControl className='select-to' sx={{ minWidth: 250, mt: 3, mb: 3 }}>
            <InputLabel>To</InputLabel>
            <Select
              name='destination'
              value={destination}
              onChange={onInputChange}
              label="To Station"
              error={errors.toError || errors.sameStopError}
              required
            >
              {busStops.map((stop) => (
                <MenuItem key={stop.id} value={stop.name}>{stop.name}</MenuItem>
              ))}
            </Select>
            {(errors.toError || errors.sameStopError) && (
              <div className="error">
                {errors.toError ? "To stop is required" : errors.sameStopError ? "From and To stops cannot be the same" : ""}
              </div>
            )}
          </FormControl>

          <TextField
            label="Received Date"
            name="receivedDate"
            value={receivedDate}
            onChange={onInputChange}
            type="date"
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              min: todayDate,
            }}
            variant="outlined"
            autoComplete="on"
            error={errors.dateError}
            helperText={errors.dateError ? "Date is required" : ""}
            required
          />
          <br />
          <FormControl sx={{ minWidth: 300, mt: 3, mb: 3 }}>
            <InputLabel id="select-bus">Select bus</InputLabel>
            <Select
              name="busID"
              value={busID}
              onChange={onInputChange}
              label="Select bus"
              required
            >
              {availableBuses.length === 0 ? (
                <MenuItem disabled>No bus is available on the date from {start} to {destination}</MenuItem>
              ) : (
                availableBuses.map((bus) => (
                  <MenuItem key={bus.id} value={bus.id}>
                    {`${bus.regNo} - ${bus.routeName} - Time of Departure From ${start} - ${bus.fromStopDepartureTime}`}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <br />
          <TextField
            className='t1'
            label='Receiver Name'
            name='receiverName'
            value={receiverName}
            onChange={onInputChange}
            error={errors.receiverNameError}
            helperText={errors.receiverNameError ? "Receiver name should only contain letters" : ""}
            required
            sx={{ minWidth: 250, marginBottom: 3, mr: 1 }}
          />
          <TextField
            label='Receiver NIC'
            name="receiverNIC"
            value={receiverNIC}
            onChange={onInputChange}
            error={errors.receiverNICError}
            helperText={errors.receiverNICError ? "Enter A Valid NIC No." : ""}
            required
            sx={{ minWidth: 250, marginBottom: 3, mr: 3 }}
          />
          <TextField
          type='number'
            label='Receiver Contact'
            name="receiverContact"
            value={receiverContact}
            onChange={onInputChange}
            error={errors.receiverContactError}
            helperText={errors.receiverContactError ? "Enter a Valid Mobile No. Ex. 0771234567" : ""}
            required
            sx={{ marginBottom: 3 }}
          />
          <br /><br />
          <div className="confirm"><LoginButton buttonTitle={"Confirm Booking"} /></div>
        </div>
      </form>
      {billDetails && (
        <Bill
          open={billOpen}
          onClose={() => setBillOpen(false)}
          billDetails={billDetails}
        />
      )}
    </>
  );
}

export default Textfield;
