<?php
function setData($values, &$aResult) {
   $mysqli = new mysqli("localhost", "telebid", "123456789", "telebid");
   
   if ($mysqli->connect_error) {
      $aResult['error'] = "Connection failed: " . $conn->connect_error;
   }
   
   $sql = "INSERT IGNORE INTO earthquakes VALUES " . $values;
   
   $stmt = $mysqli->prepare($sql);
   
   if($stmt !== FALSE) {
      if($stmt->execute() === TRUE) {
         $aResult['result'] = "OK";
      }
   }
   
    $aResult['error'] = "Error: " .$sql . " " . $mysqli->error;
}

function getData($values, &$aResult) {
   $mysqli = new mysqli("localhost", "telebid", "123456789", "telebid");
   
   if ($mysqli->connect_error) {
      $aResult['error'] = "Connection failed: " . $conn->connect_error;
   }
   
   $sql = "SELECT * FROM earthquakes WHERE";
   $types = "";
   $argsArr = array('starttime', 'endtime', 'minmagnitude', 'maxmagnitude');
   $typesArr = array(false, false, false, false);
   $magEq = false;
   $arr = array();

   // Check for specific magnitude
   if($values->{'minmagnitude'} === $values->{'maxmagnitude'} && $values->{'minmagnitude'} != "-1")
      $magEq = true;
   
   while(($element = current($values)) !== false) {
     if(!is_numeric($element)) {
        $aResult['error'] = "Error: Non numeric value";
     }
     if($element == "-1") {
        next($values);
        continue;
     }
     
     switch (key($values)) {
        case "starttime":
           $sql .= " time >= (?)";
           $types .= "d";
           $typesArr[0] = $element;
           break;
        case "endtime":
           $sql .= " time < (?)";
           $types .= "d";
           $typesArr[1] = $element;
           break;
        case "minmagnitude":
           if($magEq) {
              $sql .= " mag = (?)";
              $types .= "d";
              $typesArr[2] = $element;
              $values->{'maxmagnitude'} = "-1";
           } else {
            $sql .= " mag >= (?)";
            $types .= "d";
            $typesArr[2] = $element;
           }
           break;
        case "maxmagnitude":
           if(!$magEq) {
            $sql .= " mag < (?)";
            $types .= "d";
            $typesArr[3] = $element;
           }
           break;
     }
     
     $nextElement = next($values);
     
     if($nextElement !== false && $nextElement !== "-1") {
        $sql .= " AND ";
     }
   }

   foreach($typesArr as $i => $v) {
      if($v !== false)
         array_push($arr, $v);
   }
   
   // No filter
   if($sql === "SELECT * FROM earthquakes WHERE") {
      $sql = "SELECT * FROM earthquakes";
   }
   
   $stmt = $mysqli->prepare($sql);
   $stmt->bind_param($types, ...$arr);
   $stmt->execute();
   $result = $stmt->get_result();
   $rows = array();
   
   if($result === FALSE) {
      $aResult['result'] = $rows;
   }
   
   while($r = $result->fetch_assoc()) {
    $rows[] = $r;
   }
   
   mysqli_free_result($result);
   
   $aResult['result'] = $rows;
}

function getDataFromAPI($starttime, $endtime, &$aResult) {
   $startDateTime = date_create($starttime, timezone_open("UTC"));
   $endDateTime = date_create($endtime, timezone_open("UTC"));

   if($startDateTime === false || $endDateTime === false) {
      $aResult['error'] = "Error: Invalid date";
      return;
   }

   $json = file_get_contents('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=3.0&starttime=' . $starttime . '&endtime=' . $endtime);
   $data = json_decode($json);

   $earthquake = $data->features;
   
   foreach($earthquake as $key => $value) {
      $values = '(';
      $coordinates = $value->geometry->coordinates;
      $properties = $value->properties;

      foreach($coordinates as $cor) {
         $values .= '\'' . $cor . '\',';
      }

      foreach($properties as $pro) {
         if($pro == '')
            $values .= 'null,';
         else $values .= '\'' . $pro . '\',';
      }

      $values = substr($values, 0, strlen($values) - 1) . ')';

      setData($values);
   }
}
  
   $aResult = array();

   if( !isset($_POST['function']) ) { $aResult['error'] = 'No function name!'; }

   if( !isset($aResult['error']) ) {
      switch($_POST['function']) {
        case 'getData':
           if( !isset($_POST['args']) ) { $aResult['error'] = 'No arguments!'; }
           elseif( count($_POST['args']) != 1) { $aResult['error'] = 'Error in arguments!'; }
           else {
              getData(json_decode($_POST['args']), $aResult);
           }
           break;
        case 'saveData':
           if( !isset($_POST['args']) ) { $aResult['error'] = 'No arguments!'; }
           elseif( count($_POST['args']) != 1) { $aResult['error'] = 'Error in arguments!'; }
           else {
              setData($_POST['args'][0], $aResult);
           }
           break;
         case 'getDataFromAPI':
            if( !isset($_POST['args']) ) { $aResult['error'] = 'No arguments!'; }
            elseif( count($_POST['args']) != 2) { $aResult['error'] = 'Error in arguments!'; }
            else {
               getDataFromAPI($_POST['args'][0], $_POST['args'][1], $aResult);
            }
            break;
        
        default:
           $aResult['error'] = 'Not found function '.$_POST['functionname'].'!';
           break;
      }
   }
   
   echo json_encode($aResult);
?>
