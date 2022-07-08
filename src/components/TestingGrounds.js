import React from 'react';
import { Button, Paper, TextField } from "@mui/material";
import * as d3 from 'd3';
import { makeRectangle } from 'fractal-noise';
import { makeNoise2D } from "open-simplex-noise";
import Alea from "../utility/prng";
import { generateMountain, renderMountain } from '../utility/poiGenerator';

class TestingGrounds extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
          margin: 50,
          seed: 1,
        }
        
        this.onRandomSeed = this.onRandomSeed.bind(this);
    }

    onRandomSeed(){
      this.setState({seed: Math.floor(Math.random() * 1000000 - 500000)}, () => { this.draw() });
    }

    draw() {
        let { innerHeight: height, innerWidth: width } = window;
        const margin = this.state.margin * 2;
        height = height - margin;
        width = width - margin - 200;

        const canvas = d3
            .select('#container')
            .select('canvas').node()
            ? d3.select('#container').select('canvas')
            : d3.select('#container').append('canvas');
        canvas
            .attr('width', width)
            .attr('height', height);
        const context = canvas.node().getContext('2d');

        const rng = Alea(this.state.seed);
        const noiseX2D = makeRectangle(width, height, makeNoise2D(this.state.seed));
        const noiseY2D = makeRectangle(width, height, makeNoise2D(this.state.seed * rng() * 10000000 - 5000000));

        for (let i = 0; i < width; i += Math.ceil(width / 6)) {
            for (let j = 0; j < height; j += Math.ceil(height / 6)) {
                context.beginPath();
                context.moveTo(i, j);
                context.lineTo(i + width / 6, j);
                context.lineTo(i + width / 6, j + height / 6);
                context.lineTo(i, j + height / 6);
                context.lineTo(i, j);
                context.stroke();

                const x = i + width / 12, y = j + height / 12;
                const mtn = generateMountain(x, y, 10 * (rng() + 1) * 2, noiseX2D, noiseY2D);
                context.beginPath();
                renderMountain(mtn, context);
                context.strokeStyle = '#000';
                context.stroke();
            }
        }
    }

    componentDidMount() {
        this.draw();
    }

    render() {
        let { innerHeight: height } = window;
        const margin = this.state.margin * 2;
        height = height - margin;


        return (
            <div>
              <Paper 
                style={{
                  margin: this.state.margin - 15 + 'px', 
                  marginBottom: 0, 
                  padding: '15px',
                  height: height,
                  display: 'flex',
                  flexDirection: 'row',
                }}
                elevation={3}
              >
                <div id="container" style={{ width: '100%'}}></div>
                <div 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingLeft: '12px',
                    width: '200px',
                  }}
                >
                  <Button variant='outlined' onClick={this.onRandomSeed}>Random Seed</Button>
                  <TextField 
                    value={this.state.seed}
                    onChange={this.handleChange}
                    name='seed'
                    label="Seed" 
                    type='number' 
                    style={{marginTop: '12px'}} 
                  />
                </div>
              </Paper>
            </div>
        )
    }
}

export default TestingGrounds;