import React from "react";
import Alea from "../utility/prng";
import { Button, Paper, Slider, TextField, Typography } from "@mui/material";
import VoronoiPainter from "../utility/voronoi";


class MapHost extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      margin: 50,
      seed: 1,
      diskSpacing: 10, //8000,
      vPaint: null,
      initRelax: 1,
      cutoff: 0,
      numContinents: 1,
    }
    
    this.handleChange = this.handleChange.bind(this);
    this.onRelax = this.onRelax.bind(this);
    this.onRandomSeed = this.onRandomSeed.bind(this);
  }

  initVoronoi() {
    const props = this._getVoronoiProps();
    const vPaint = new VoronoiPainter(props);
    this.setState({vPaint}, () => {
      this.state.vPaint.relax(this.state.initRelax);
      this.state.vPaint.draw();
    });
  }

  _getVoronoiProps() {
    const { innerWidth: width, innerHeight: height } = window;
    const rightPanelWidth = 200;
    const margin = this.state.margin * 2;

    return {
      height: height - margin,
      width: width - margin - rightPanelWidth,
      random: Alea(this.state.seed),
      diskSpacing: this.state.diskSpacing,
      cutoff: this.state.cutoff,
      seed: this.state.seed,
      numContinents: this.state.numContinents,
    };
  }

  componentDidMount() {
    this.initVoronoi();
  }

  handleChange(event) {
    const {name, value} = event.target;
    this.setState({[name]: value}, () => {
      this.initVoronoi();
    })
  }

  onRelax(){
    this.state.vPaint.relax();
    this.state.vPaint.draw();
  }

  onRandomSeed(){
    this.setState({seed: Math.floor(Math.random() * 1000000 - 500000)}, () => { this.initVoronoi(); });
  }

  render() {
    const { innerHeight: height } = window;
    const margin = this.state.margin * 2;
    const heightActual = height - margin;
    return (
      <div>
        <Paper 
          style={{
            margin: this.state.margin - 15 + 'px', 
            marginBottom: 0, 
            padding: '15px',
            height: heightActual,
            display: 'flex',
            flexDirection: 'row',
          }}
          elevation={3}
        >
          <div id="container"></div>
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingLeft: '12px',
            }}
          >
            {/* <Button variant='outlined' onClick={this.onRelax}>Relax</Button> */}
            <Button variant='outlined' onClick={this.onRandomSeed}>Random Seed</Button>
            <TextField 
              value={this.state.seed}
              onChange={this.handleChange}
              name='seed'
              label="Seed" 
              type='number' 
              style={{marginTop: '12px'}} 
            />
            <Typography variant='overline' style={{marginTop: '12px', marginBottom: '-12px'}} gutterBottom>
              point spacing
            </Typography>
            <Slider
              value={this.state.diskSpacing}
              onChange={this.handleChange}
              name='diskSpacing'
              min={2}
              max={20}
              valueLabelDisplay="auto"
            />
            {/* <Typography variant='overline' style={{marginTop: '12px', marginBottom: '-12px'}} gutterBottom>
              cutoff
            </Typography>
            <Slider
              value={this.state.cutoff}
              onChange={this.handleChange}
              name='cutoff'
              min={0}
              max={100}
              valueLabelDisplay="auto"
            /> */}
            {/* <Typography variant='overline' style={{marginTop: '12px', marginBottom: '-12px'}} gutterBottom>
              # continents
            </Typography>
            <Slider
              value={this.state.numContinents}
              onChange={this.handleChange}
              name='numContinents'
              min={1}
              max={10}
              marks={true}
              valueLabelDisplay="auto"
            /> */}
          </div>
        </Paper>
      </div>
    )
  }
}

export default MapHost;
