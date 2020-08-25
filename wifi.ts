namespace WiFiIoT {
    let flag = true;
    let httpReturnArray: string[] = []
    let temp_cmd = ""
    let lan_cmd = ""
    let wan_cmd = ""
	let wan_cmd_value = ""
	let wifi_cmd = ""
    let Lan_connected = false
    let Wan_connected = false
	let Wifi_remote = false
	let Wifi_connected = "0"
	let myChannel = ""
	
	type EvtAct =(WiFiMessage:string) => void;
    let Wifi_Remote_Conn: EvtAct = null;
	let Wifi_Conn: () => void = null;
	let Wifi_DisConn: () => void = null;
	let LAN_Remote_Conn: (LAN_Command:string) => void = null;
	let WAN_Remote_Conn: (WAN_Command:string) => void = null;
	let WAN_Remote_Conn_value: (WAN_Command: string, Value: number) => void = null;
	

    export enum httpMethod {
        //% block="GET"
        GET,
        //% block="POST"
        POST,
        //% block="PUT"
        PUT,
        //% block="DELETE"
        DELETE
    }
	
	export enum ESP_SERVO_PORT {
        //% block="S1"
        S1,
        //% block="S2"
        S2,
        //% block="S3"
        S3
    }
    export enum ESP_360_SERVO_DIR {
        //% block="Clockwise"
        clockwise,
        //% block="Antilockwise"
        anticlockwise
    }

    // -------------- 1. Initialization ----------------
    //%blockId=wifi_ext_board_initialize_wifi
    //%block="Initialize WiFi IoT:bit and OLED"
    //% weight=140
    //% blockGap=7	
    export function initializeWifi(): void {
        serial.redirect(SerialPin.P16, SerialPin.P8, BaudRate.BaudRate115200);
		serial.setTxBufferSize(64)
		serial.setRxBufferSize(64)
        OLED.init(64, 128)

        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), () => {
            temp_cmd = serial.readLine()
            //OLED.showStringWithNewLine(temp_cmd)
            let tempDeleteFirstCharacter = ""

            if (temp_cmd.charAt(0).compare("#") == 0) {
                tempDeleteFirstCharacter = temp_cmd.substr(1, 20)
                httpReturnArray.push(tempDeleteFirstCharacter)
            } else if (Lan_connected && temp_cmd.charAt(0).compare(",") == 0) {
                lan_cmd = temp_cmd.substr(1, 20)
				OLED.showStringWithNewLine("LAN cmd: " + lan_cmd)
                if (LAN_Remote_Conn) LAN_Remote_Conn(lan_cmd)
            } else if (Wan_connected && temp_cmd.charAt(0).compare(":") == 0) {
                wan_cmd = temp_cmd.substr(1, 20)
				if (wan_cmd.includes("$")) {
                    let pos = wan_cmd.indexOf("$");
                    let temp = wan_cmd.substr(0, pos);
                    wan_cmd_value = wan_cmd.substr(pos + 1, wan_cmd.length);
                    wan_cmd = temp;
                }
				OLED.showStringWithNewLine("WAN cmd: " + wan_cmd)
				if (temp_cmd.includes("$") && WAN_Remote_Conn_value) {
                    OLED.showStringWithNewLine("WAN cmd value: " + wan_cmd_value);
                    WAN_Remote_Conn_value(wan_cmd, parseInt(wan_cmd_value));
                }
                else if (WAN_Remote_Conn) WAN_Remote_Conn(wan_cmd)
            } else if (Wifi_remote && temp_cmd.charAt(0).compare(":") == 0) {
                wifi_cmd = temp_cmd.substr(1, 20)
				OLED.showStringWithNewLine("WIFI msg: " + wifi_cmd)
                if (Wifi_Remote_Conn) Wifi_Remote_Conn(wifi_cmd)
            } else if (temp_cmd.charAt(0).compare("%") == 0)
			{
				// wifi status change
				if (Wifi_connected != temp_cmd.charAt(1))
				{
					Wifi_connected = temp_cmd.charAt(1)
					
					// 0:Not connected, 1:connecting, 2:connected
					if(Wifi_Conn && Wifi_connected == "2") Wifi_Conn()
						
					if(Wifi_DisConn && Wifi_connected == "0") Wifi_DisConn()
					
				}
		
			} else {
				if (temp_cmd.substr(0, 11) == "HTTP client")
					temp_cmd = "Keep listen"
				OLED.showStringWithNewLine(temp_cmd.substr(0,20))
            }
		
        })

        basic.pause(5000)
    }

    // -------------- 2. WiFi ----------------
    //% blockId=wifi_ext_board_set_wifi
    //% block="Set WiFi to ssid %ssid| pwd %pwd"   
    //% weight=135
	//% blockGap=7	
    export function setWifi(ssid: string, pwd: string): void {
        serial.writeLine("(AT+wifi?ssid=" + ssid + "&pwd=" + pwd + ")");
    }
	
    //% blockId=wifi_ext_board_on_wifi_connect
    //% block="On WiFi connected"   
    //% weight=133
	//% blockGap=7	
    export function on_wifi_connect(handler: () => void): void {
        Wifi_Conn = handler;
    
    }
	
	//% blockId=wifi_ext_board_on_wifi_disconnect
    //% block="On WiFi disconnected"   
    //% weight=132
	//% blockGap=7	
    export function on_wifi_disconnect(handler: () => void): void {
        Wifi_DisConn = handler;
    
    }

	//% blockId=wifi_ext_board_is_wifi_connect
    //% block="WiFi connected?"   
    //% weight=131
	//% blockGap=7	
    export function is_wifi_connect(): boolean {
        if(Wifi_connected == "2") 
		return true
		else return false
		
    }
    // -------------- 3. Cloud ----------------
    //% blockId=wifi_ext_board_set_thingspeak
    //% block="Send Thingspeak key* %key|field1 value%field1||field2 value%field2|field3 value%field3|field4 value%field4|field5 value%field5|field6 value%field6|field7 value%field7|field8 value%field8"
    //% weight=130
    //% expandableArgumentMode="enabled"
    //% blockGap=7	
    export function sendThingspeak(key: string, field1: number = null, field2: number = null, field3: number = null, field4: number = null, field5: number = null, field6: number = null, field7: number = null, field8: number = null): void {
        let command = "(AT+thingspeak?key=";
        if (key == "") { return }
        else { command = command + key }
        if (field1 != null) { command = command + "&field1=" + field1 }
        if (field2 != null) { command = command + "&field2=" + field2 }
        if (field3 != null) { command = command + "&field3=" + field3 }
        if (field4 != null) { command = command + "&field4=" + field4 }
        if (field5 != null) { command = command + "&field5=" + field5 }
        if (field6 != null) { command = command + "&field6=" + field6 }
        if (field7 != null) { command = command + "&field7=" + field7 }
        if (field8 != null) { command = command + "&field8=" + field8 }
        command = command + ")"
        serial.writeLine(command);
    }



    //% blockId=wifi_ext_board_set_ifttt
    //% block="Send IFTTT key* %key|event_name* %event|value1 %value1|value2 %value2|value3 %value3"
    //% weight=125
    //% blockGap=7		
    export function sendIFTTT(key: string, eventname: string, value1: number, value2: number, value3: number): void {
        serial.writeLine("(AT+ifttt?key=" + key + "&event=" + eventname + "&value1=" + value1 + "&value2=" + value2 + "&value3=" + value3 + ")");
    }

	// -------------- 4. Others ----------------


    //%blockId=wifi_ext_board_generic_http
    //% block="Send generic HTTP method %method| http://%url| header %header| body %body"
    //% weight=115
    //% blockGap=7	
    export function sendGenericHttp(method: httpMethod, url: string, header: string, body: string): void {
        httpReturnArray = []
        let temp = ""
        switch (method) {
            case httpMethod.GET:
                temp = "GET"
                break
            case httpMethod.POST:
                temp = "POST"
                break
            case httpMethod.PUT:
                temp = "PUT"
                break
            case httpMethod.DELETE:
                temp = "DELETE"
                break
        }
        serial.writeLine("(AT+http?method=" + temp + "&url=" + url + "&header=" + header + "&body=" + body + ")");
    }

    
    //% blockId="wifi_ext_board_generic_http_return" 
    //% block="HTTP response (string array)"
    //% weight=110
    export function getGenericHttpReturn(): Array<string> {
        return httpReturnArray;
    }


	

	// -------------- 5. LAN/WAN Repmote ----------------
    //%subcategory=Control
	//%blockId=wifi_ext_board_start_server_LAN
    //%block="Start WiFi remote control (LAN)"
    //% weight=85
    //% blockGap=7		
	//% blockHidden=true
    export function startWebServer_LAN(): void {
        flag = true
        serial.writeLine("(AT+startWebServer)")
        Lan_connected = true
        while (flag) {

            serial.writeLine("(AT+write_sensor_data?p0=" + pins.analogReadPin(AnalogPin.P0) + "&p1=" + pins.analogReadPin(AnalogPin.P1) + "&p2=" + pins.analogReadPin(AnalogPin.P2) + ")")
            basic.pause(500)
            if (!flag)
                break;
        }

    }
	
	//%subcategory=Control
    //%blockId=wifi_ext_board_start_server_WAN
    //%block="Start WiFi remote control (WAN)"
    //% weight=80
    //% blockGap=7		
    export function startWebServer_WAN(): void {
        flag = true
        serial.writeLine("(AT+pubnub)")
        Wan_connected = true
        
    }

	//%subcategory=Control
    //%blockId=wifi_ext_board_on_LAN_connect
    //%block="On LAN command received"
    //% weight=75
	//% blockGap=7	draggableParameters=reporter
	//% blockHidden=true
    export function on_LAN_remote(handler: (LAN_Command:string) => void): void {
        LAN_Remote_Conn = handler;
    }

	//%subcategory=Control
    //%blockId=wifi_ext_board_on_WAN_connect
    //%block="On WAN command received"
    //% weight=70
	//% blockGap=7	draggableParameters=reporter
    export function on_WAN_remote(handler: (WAN_Command:string) => void): void {
        WAN_Remote_Conn = handler;
    }
	//%subcategory=Control
    //%blockId=wifi_ext_board_on_WAN_connect_value
    //%block="On WAN command received with value"
    //% weight=65
    //% blockGap=7	draggableParameters=reporter
    export function on_WAN_remote_value(handler: (WAN_Command: string, Value: number) => void): void {
        WAN_Remote_Conn_value = handler;
    }

	
// -------------- 7. Wifi Channel ----------------
    //%subcategory=Channel
    //%blockId=wifi_listen_channel
    //%block="WiFi start listening in channel %channel"
    //% weight=20
    //% blockGap=7
    export function wifi_listen_channel(channel: string): void {
        Wifi_remote = true
		myChannel = channel
        serial.writeLine("(AT+pubnubreceiver?channel=" + myChannel + ")")
    }

    //%subcategory=Channel
    //%blockId=wifi_send_message
    //%block="WiFi send message %message in channel %channel"
    //% weight=15
    //% blockGap=7
    export function wifi_send_message(message: string, channel: string): void {
        myChannel = channel
		serial.writeLine("(AT+pubnubsender?channel=" + myChannel + "&message=" + message + ")")
    }

    //%subcategory=Channel
    //%blockId=wifi_ext_board_on_wifi_receieved
    //%block="On WiFi received"
    //% weight=10
    //% blockGap=7	draggableParameters=reporter
    export function on_wifi_received(handler: (WiFiMessage: string) => void): void {
        Wifi_Remote_Conn = handler;
    }
	
	// -------------- 8.ESP Control ----------------
    //%subcategory=ESP Servo
    //%blockId=ESP_Servo_180
    //%block="Turn ESP 180° Servo to %deg ° at %pin"
    //% weight=36
    //% deg.min=0 deg.max=180
    export function ESP_Servo_180(deg:number,pin:ESP_SERVO_PORT): void {
        let port
        if(pin==0){port="S1"}
        if(pin==1){port="S2"}
        if(pin==2){port="S3"}
        let cmd = "(AT+servo_180?pin="+port+"&degree="+deg.toString()+")"
        serial.writeLine(cmd)
    }
    //%subcategory=ESP Servo
    //%blockId=ESP_Servo_360
    //%block="Turn ESP 360° Servo in %dir with %speed speed at %pin"
    //% weight=35
    //% speed.min=0 speed.max=100
    export function ESP_Servo_360(dir: ESP_360_SERVO_DIR, speed:number ,pin: ESP_SERVO_PORT): void {
        let port
        if (pin == 0) { port = "S1" }
        if (pin == 1) { port = "S2" }
        if (pin == 2) { port = "S3" }
        let direction
        if(dir==0){direction="clockwise"}
        if(dir==1){direction="anticlockwise"}
        let cmd = "(AT+servo_360?pin=" + port + "&direction=" +direction  + "&speed="+speed.toString()+")"
        serial.writeLine(cmd)
    }
	// -------------- 6. General ----------------		

    //%subcategory=ESP
    //%blockId=wifi_ext_board_version
    //%block="Get firmware version"
    //% weight=30
    //% blockGap=7	
    export function sendVersion(): void {
        serial.writeLine("(AT+version)");
    }

    //%subcategory=ESP
    //%blockId=wifi_ext_board_at
    //%block="Send AT command %command"
    //% weight=25
    export function sendAT(command: string): void {
        serial.writeLine(command);
        flag = false
    }
}

