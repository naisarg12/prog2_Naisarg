/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog2/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader


// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
    
    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var indexArray = []; // 1D array of vertex indices for WebGL
        
        // Loop through all triangle sets
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            // collect vertex coordinates
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);
            }
            
            // collect triangle vertex indices
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                indexArray = indexArray.concat(inputTriangles[whichSet].triangles[whichSetTri]);
            }
        }

        // Create and bind vertex buffer
        vertexBuffer = gl.createBuffer(); // initialize empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // activate vertex buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW); // send vertex data to buffer

        // Create and bind index buffer
        triangleBuffer = gl.createBuffer(); // initialize empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate index buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), gl.STATIC_DRAW); // send indices to buffer

        triBufferSize = indexArray.length; // store the number of indices
    }
}

// setup the webGL shaders
function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        void main(void) {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // all fragments are white
        }
    `;
    
    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
    attribute vec3 vertexPosition;
    uniform mat4 transformationMatrix;

    void main(void) {
        gl_Position = transformationMatrix * vec4(vertexPosition, 1.0); // apply the transformation
    }
`;

    
    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
            
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                    gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // Bind the index buffer (triangleBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    
    // Draw the triangles using indices from the index buffer
    gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0); // Render indexed triangles
} // end render triangles

//added this function
function setupTransformationMatrix() {
    // Orthographic projection matrix: maps world coordinates to normalized device coordinates
    var orthoMatrix = mat4.create();
    mat4.ortho(orthoMatrix, 0, 1, 0, 1, 0.1, 100); // left, right, bottom, top, near, far

    // View matrix: Translate the scene to be visible
    var viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -1.0]); // move the scene backward

    // Combine the orthographic and view matrices
    var transformationMatrix = mat4.create();
    mat4.multiply(transformationMatrix, orthoMatrix, viewMatrix);

    // Pass the transformation matrix to the vertex shader
    var transformationMatrixLocation = gl.getUniformLocation(shaderProgram, "transformationMatrix");
    gl.uniformMatrix4fv(transformationMatrixLocation, false, transformationMatrix);
}


/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
    //adding this one function call below
  setupTransformationMatrix(); // apply the transformation matrix to position the shapes
  renderTriangles(); // draw the triangles using webGL
  
} // end main
