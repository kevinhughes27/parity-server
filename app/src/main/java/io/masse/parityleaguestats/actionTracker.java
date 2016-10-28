package io.masse.parityleaguestats;

import java.io.Serializable;
import java.util.ArrayList;

/**
 * Created by mmasse on 14-12-07.
 * Extracted from Stats
 */
public class actionTracker implements Serializable{
    private ArrayList<String> arrayEventNames = new ArrayList<String>();
    private ArrayList<String> arrayEventActions = new ArrayList<String>();
    private Stats parent;

    public actionTracker(Stats parent) {
        this.parent = parent;
    }

    public int size(){
        return arrayEventNames.size();
    }

    public String getAction(int i) {
        return arrayEventActions.get(i);
    }

    public String getName(int i)
    {
        return arrayEventNames.get(i);
    }

    public void setAction(int i, String action){
        arrayEventActions.set(i , action);
    }

    public void setName(int i, String name){
        arrayEventNames.set(i , name);
    }

    public void add (int i, String name, String action){
        arrayEventActions.add(i, action);
        arrayEventNames.add(i, name);
    }

    public void remove (int i){
        arrayEventActions.remove(i);
        arrayEventNames.remove(i);
    }

    public String compileCSV(){
        String csvFile = "";

        if (size() < 0) {
            return csvFile;
        }

        String csvLine = "";

        //Loop for every action
        for (int i = size() - 1; i >= 0; i-- ){

            //change of direction = end of possession, and new line
            if (getAction(i).equals("Direction")||getAction(i).equals("+1")||getAction(i).equals("-1")) {

                if (!csvLine.equals("")) {
                    csvFile = csvFile + "\n" + csvLine;
                    csvLine = "";
                }
                csvLine = getAction(i) + "," + getName(i) + "," + csvLine;
                csvFile = csvFile + "\n" + csvLine;
                csvLine = "";

                //otherwise not the end of possession, and not a new line.
            }else{
                if ((csvLine.equals("")) && (!getAction(i).equals("Pass")) && (!getAction(i).equals("Throw Away")) && (!getAction(i).equals("POINT"))) {
                    csvLine = getAction(i) + "," + getName(i) + "," + csvLine;
                    csvFile = csvFile + "\n" + csvLine;
                    csvLine = "";
                } else {
                    csvLine = getAction(i) + "," + getName(i) + "," + csvLine;
                }
            }
        }

        return csvFile;
    }

}

