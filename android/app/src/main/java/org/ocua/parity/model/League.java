package org.ocua.parity.model;

import org.json.JSONObject;
import org.ocua.parity.BuildConfig;

import java.io.Serializable;

class LeagueLoadError extends RuntimeException {
    public LeagueLoadError(String msg) {
        super(msg);
    }
}

public class League implements Serializable {
    public String id = "";
    public String name = "";
    public int lineSize = 6;

    public void load(JSONObject json) {
        try {
            this.id = json.getString("id");
            this.name = json.getString("name");
            this.lineSize = json.getInt("lineSize");
        } catch (Exception e) {
                throw new LeagueLoadError(e.getMessage());
        }
    }
}
