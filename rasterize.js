/* GLOBAL CONSTANTS AND VARIABLES */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
var Eye = new vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all-powerful gl object
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var colorBuffer; // this contains vertex colors
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexColorAttrib; // where to put color for vertex shader


// Generate the vertices and indices for a large triangle made up of smaller triangles
function generateLargeTriangle(numDivisions) {
    var coordArray = [];  // 1D array of vertex coords
    var colorArray = [];  // 1D array of vertex colors
    var indexArray = [];  // 1D array of indices
    var colors = [1.0, 1.0, 0.0]; // Use yellow for all triangles

    var size = 1.0;  // Size of the large triangle (base and height)
    var step = size / numDivisions;  // Step size for each smaller triangle
    
    // Generate vertices and colors
    for (var i = 0; i <= numDivisions; i++) {
        for (var j = 0; j <= i; j++) {
            var x = j * step;
            var y = i * step;

            // Push vertex coordinates
            coordArray.push(x, y, WIN_Z);

            // Push vertex colors (same color for all vertices)
            colorArray.push(colors[0], colors[1], colors[2]);
        }
    }

    // Generate indices to form triangles
    var index = 0;
    for (var i = 0; i < numDivisions; i++) {
        for (var j = 0; j < i; j++) {
            // Form two triangles per grid square
            indexArray.push(index, index + i + 1, index + i + 2);
            indexArray.push(index, index + i + 2, index + 1);
            index++;
        }
        index++;
    }

    triBufferSize = indexArray.length; // Set the triangle buffer size
    return { coords: coordArray, indices: indexArray, colors: colorArray };
}

// Setup the WebGL environment
function setupWebGL() {
    var canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl");

    try {
        if (gl == null) throw "Unable to create gl context -- is your browser gl ready?";
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Black background
        gl.clearDepth(1.0);  // Use max when clearing depth buffer
        gl.enable(gl.DEPTH_TEST);  // Enable hidden surface removal
    } catch (e) {
        console.log(e);
    }
}

// Load the dynamically generated triangles into buffers
function loadTriangles(numDivisions) {
    var largeTriangle = generateLargeTriangle(numDivisions);  // Get vertices and indices

    // Send the vertex coordinates to WebGL
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(largeTriangle.coords), gl.STATIC_DRAW);

    // Send the vertex colors to WebGL
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(largeTriangle.colors), gl.STATIC_DRAW);

    // Send the triangle indices to WebGL
    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(largeTriangle.indices), gl.STATIC_DRAW);
}

// Setup the WebGL shaders
function setupShaders() {
    var fShaderCode = `
        precision mediump float;
        varying vec3 fragColor;

        void main(void) {
            gl_FragColor = vec4(fragColor, 1.0);
        }
    `;
    
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexColor;
        varying vec3 fragColor;

        void main(void) {
            fragColor = vertexColor;
            gl_Position = vec4(vertexPosition, 1.0);
        }
    `;
    
    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fShaderCode);
        gl.compileShader(fShader);

        var vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vShaderCode);
        gl.compileShader(vShader);

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            throw "Error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            throw "Error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
        } else {
            var shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, fShader);
            gl.attachShader(shaderProgram, vShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw "Error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else {
                gl.useProgram(shaderProgram);
                
                vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");
                gl.enableVertexAttribArray(vertexPositionAttrib);

                vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
                gl.enableVertexAttribArray(vertexColorAttrib);
            }
        }
    } catch (e) {
        console.log(e);
    }
}

// Render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0);
}

// Main function
function main() {
    window.addEventListener("keydown", function (event) {
        if (event.code === "Space") {
            setupWebGL();
            loadTriangles(20);  // Use 20 divisions for the large triangle
            setupShaders();
            renderTriangles();
        }
    });
}
