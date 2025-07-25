---
layout: default
title: "Porygon: A Programmatically Generated 3D Model"
description: "Creating a 3D model of Pokemon Porygon entirely through OpenSCAD code, staying true to its programming-based nature"
keywords: ["OpenSCAD", "3D modeling", "Pokemon", "Porygon", "programmatic design", "3D printing", "computational design", "code art"]
author: "Brian Benchoff"
date: 2025-06-04
last_modified_at: 2021-08-21
image: "https://raw.githubusercontent.com/bbenchoff/Porygon/master/Porygon.stl"
---
## Porygon

According to the Pokedex, Porygon is: 

> A Pokemon that consists entirely of programming code. Capable of moving freely in cyberspace.

While there are many 3D models of Pokemon, there are no 3D models of Pokemon that were created entirely by computer code. OpenSCAD is a programming language that creates 3D models, so I made [Porygon in OpenSCAD](https://github.com/bbenchoff/Porygon/blob/master/Porygon.stl)


<script src="https://embed.github.com/view/3d/bbenchoff/Porygon/master/Porygon.stl"></script>


Code is as follows:

```ruby
module bodyHalf()
{
	polyhedron(
		points=[ [16,31,5], [0,31,5],   [0,34,23],  [0,35,30], 
                 [18,35,30],[21,34,23], [21,-23,23],[11,-1,49],
                 [0,-1,49], [13,-16,44],[0,-16,44], [0,-23,23],
                 [0,-9,5], [16,-9,5]],

		faces=[ [0,2,1], [0,5,2], [2,5,4], [3,2,4], [4,5,6], 
                [7,8,3], [3,4,7], [4,6,7], [8,7,9], [7,6,9],
                [10,8,9], [6,11,9],[10,9,11],[11,6,12],[6,13,12], 
                [13,5,0], [6,5,13],[0,1,12], [12,13,0]]
	);
}

module tail()
{
	translate([0,-5,0])
		polyhedron(
		points=[ [0,90,67],[6,37,30], [-6,37,30],[13,40,5],
                 [-13,40,5], [13,32,5], [-13,32,5]],

		faces=[ [0,1,2], [0,3,1], [0,2,4], [0,4,3],[1,3,5],
                [4,2,6], [3,6,5], [3,4,6],[1,6,2], [1,5,6] ]
		);
}

module footLeft()
{
	polyhedron(
		points=[[40,-20,0], [22,-20,0], [22,36,0], [40,36,0],
                [22,36,13], [40,36,8], [40,-20,6], [22,-20,9],
                [40,14,20], [22,14,25], [40,14,0]],

		faces=[ [2,1,0], [0,3,2], [2,3,4], [5,4,3], [1,6,0],
                [6,1,7], [6,7,8], [9,8,7], [9,5,8], [4,5,9],
                [0,6,10], [10,6,8], [5,3,10], [10,8,5], [4,9,2],
		[2,9,1], [1,9,7]
		]
	);
}

module headhalf()
{
	polyhedron(
		points = [[18,-16,44], [0,-16,44], [8,-50,44], [8,-52,46], 
                  [0,-50,44], [0,-52,46],[15,-22,60], [12,-25,67],
                  [0,-25,67], [0,-15,74], [9,-15,74], [12,-6,76],
                  [0,-6,76], [17,-3,67], [18,-10,58], [20,10,53], 
                  [20,14,66], [9,12,80],[0,12,80], [0,14,66],
                  [0,10,53]
		],
		faces = [ [0,1,2], [1,4,2], [2,4,3], [4,5,3], [0,2,6],
                  [8,7,5], [3,5,7], [6,3,7], [2,3,6], [7,10,11],
                  [7,8,10], [8,9,10], [9,11,10], [9,12,11],
                  [6,7,11], [6,11,13], [6,13,14], [6,14,0],
                  [0,14,15], [14,13,15], [13,16,15], [13,17,16],
		  [13,11,17], [11,12,17], [17,12,18], [17,18,19],
                  [19,16,17], [15,16,20],[20,16,19], [20,0,15],
                  [1,0,20],
				]
	);
}

module body()
{
	union()
	{
		bodyHalf();
		mirror([1,0,0])
		{
			bodyHalf();
		}
	}
}

module feet()
{
	union()
	{
		translate([-7,0,0]) footLeft();
		mirror([1,0,0]){
			translate([-7,0,0]) footLeft();
		}
	}
}

module head()
{
	union()
	{
		headhalf();
		mirror([1,0,0])
		{
			headhalf();
		}
	}
}

module porygon()
{   
	union()
	{
		head();
		body();
		tail();
		feet();
	}
}

porygon();

```

[back](../)