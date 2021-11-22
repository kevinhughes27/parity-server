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

    public int teamSize = BuildConfig.MAX_FEMALES + BuildConfig.MAX_MALES;

    public void load(JSONObject json) {
        try {
            this.id = json.getString("id");
            this.name = json.getString("name");
        } catch (Exception e) {
                throw new LeagueLoadError(e.getMessage());
        }
    }
}
