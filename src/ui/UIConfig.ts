import { UIConfig } from "./UITypes";

let uiConfig:UIConfig = {
	start: {
		text: "welcome!\n'1' for A1\n'2' for A2\n'end' to disconnect\n",
		responseHandler: (response, readline, questions, callback)=>{
			if(response === "1"){
				callback(questions.A1);
			}else if(response === "2"){
				callback(questions.A2);
			}else if(response === "end"){
				readline.write("bye!\n");
				readline.close();
			}else{
				readline.write("invalid input!\n");
				callback();
			}
		},
	},
	A1:{
		text: "A1!\n'start' to go back to the start\n'2' for A2\n'end' to disconnect\n",
		responseHandler: (response, readline, questions, callback)=>{
			if(response === "2"){
				callback(questions.A2);
			}else if(response === "start"){
				callback(questions.start);
			}else if(response === "end"){
				readline.write("bye!\n");
				readline.close();
			}else{
				readline.write("invalid input!\n");
				callback();
			}
		},
	},
	A2:{
		text: "A2!\n'start' to go back to the start\n'1' for A1\n'end' to disconnect\n",
		responseHandler: (response, readline, questions, callback)=>{
			if(response === "1"){
				callback(questions.A1);
			}else if(response === "start"){
				callback(questions.start);
			}else if(response === "end"){
				readline.write("bye!\n");
				readline.close();
			}else{
				readline.write("invalid input!\n");
				callback();
			}
		},
	},
};

export default uiConfig;
